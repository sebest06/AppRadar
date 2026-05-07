package com.appradar.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.ui.viewmodel.ActiveTrailViewModel
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveTrailScreen(
    navController: NavController,
    trailUuid: String,
    viewModel: ActiveTrailViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val trail by viewModel.trail.collectAsState()
    val waypoints by viewModel.waypoints.collectAsState()
    val pathPoints by viewModel.pathPoints.collectAsState()
    val reachedWaypoints by viewModel.reachedWaypoints.collectAsState()

    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasLocationPermission = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true || 
                                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(trailUuid) {
        viewModel.loadTrail(trailUuid)
        Configuration.getInstance().userAgentValue = context.packageName
        
        if (!hasLocationPermission) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(trail?.name ?: "Cargando...") },
                actions = {
                    Button(onClick = { navController.navigate(com.appradar.ui.navigation.Screen.Leaderboard.route) }) {
                        Text("Ranking")
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)
                        setMultiTouchControls(true)
                        controller.setZoom(15.0)
                    }
                },
                update = { mapView ->
                    // Use a simple list to manage overlays to avoid constant re-creation if possible,
                    // but for OSMDroid, sometimes it's easier to rebuild for simple state changes.
                    // To prevent infinite location updates, we only add the MyLocationOverlay once.
                    if (mapView.overlays.none { it is MyLocationNewOverlay } && hasLocationPermission) {
                        val myLocationOverlay = object : MyLocationNewOverlay(GpsMyLocationProvider(mapView.context), mapView) {
                            override fun onLocationChanged(location: android.location.Location?, source: org.osmdroid.views.overlay.mylocation.IMyLocationProvider?) {
                                super.onLocationChanged(location, source)
                                location?.let { viewModel.onLocationUpdate(it) }
                            }
                        }
                        myLocationOverlay.enableMyLocation()
                        mapView.overlays.add(myLocationOverlay)
                    }

                    // For path and markers, we can clear and re-add or update existing ones.
                    // Remove old polylines and markers
                    mapView.overlays.removeAll { it is Polyline || it is Marker }

                    if (pathPoints.isNotEmpty()) {
                        val polyline = Polyline()
                        polyline.setPoints(pathPoints.map { GeoPoint(it.latitude, it.longitude) })
                        polyline.outlinePaint.color = Color.BLUE
                        polyline.outlinePaint.strokeWidth = 5f
                        mapView.overlays.add(polyline)
                        
                        if (mapView.tag == null) {
                            mapView.controller.setCenter(GeoPoint(pathPoints.first().latitude, pathPoints.first().longitude))
                            mapView.tag = "centered"
                        }
                    }

                    waypoints.forEach { wp ->
                        val marker = Marker(mapView)
                        marker.position = GeoPoint(wp.latitude, wp.longitude)
                        val isReached = reachedWaypoints.contains(wp.waypointUuid)
                        marker.title = if (isReached) "Alcanzado: ${wp.name}" else wp.name
                        mapView.overlays.add(marker)
                    }
                    
                    mapView.invalidate()
                }
            )
            
            Card(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp)
            ) {
                Text(
                    text = "Waypoints: ${reachedWaypoints.size} / ${waypoints.size}",
                    modifier = Modifier.padding(8.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
