package com.appradar.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
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
import androidx.core.graphics.drawable.toBitmap
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.R
import com.appradar.ui.viewmodel.ActiveTrailViewModel
import com.appradar.util.formatElapsedTime
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
    val currentUser by viewModel.currentUser.collectAsState()
    val waypoints by viewModel.waypoints.collectAsState()
    val pathPoints by viewModel.pathPoints.collectAsState()
    val reachedWaypoints by viewModel.reachedWaypoints.collectAsState()
    val isRaceStarted by viewModel.isRaceStarted.collectAsState()
    val isPaused by viewModel.isPaused.collectAsState()
    val elapsedTime by viewModel.elapsedTimeMillis.collectAsState()
    val userIconResId by viewModel.userIconResId.collectAsState()
    val error by viewModel.error.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
        }
    }

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

        val permsToRequest = mutableListOf<String>()
        if (!hasLocationPermission) {
            permsToRequest += Manifest.permission.ACCESS_FINE_LOCATION
            permsToRequest += Manifest.permission.ACCESS_COARSE_LOCATION
        }
        // Pedir permiso de notificaciones en Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
        ) {
            permsToRequest += Manifest.permission.POST_NOTIFICATIONS
        }
        if (permsToRequest.isNotEmpty()) {
            permissionLauncher.launch(permsToRequest.toTypedArray())
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(trail?.name ?: "Cargando...") },
                actions = {
                    Button(onClick = { 
                        val tUuid = trail?.trailUuid ?: ""
                        val teamUuid = currentUser?.uuid_team ?: ""
                        navController.navigate(com.appradar.ui.navigation.Screen.Leaderboard.createRoute(tUuid, teamUuid)) 
                    }) {
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
                    if (mapView.overlays.none { it is MyLocationNewOverlay } && hasLocationPermission) {
                        val myLocationOverlay = object : MyLocationNewOverlay(GpsMyLocationProvider(mapView.context), mapView) {
                            override fun onLocationChanged(location: android.location.Location?, source: org.osmdroid.views.overlay.mylocation.IMyLocationProvider?) {
                                super.onLocationChanged(location, source)
                                location?.let { viewModel.onLocationUpdate(it) }
                            }
                        }
                        myLocationOverlay.enableMyLocation()
                        myLocationOverlay.enableFollowLocation()
                        // Use the selected icon for both stationary and moving states
                        val userIcon = ContextCompat.getDrawable(context, userIconResId)
                        userIcon?.let {
                            myLocationOverlay.setPersonIcon(it.toBitmap())
                            myLocationOverlay.setDirectionIcon(it.toBitmap())
                        }
                        mapView.overlays.add(myLocationOverlay)
                    } else {
                        // Update existing overlay icon if it changed
                        val myLocationOverlay = mapView.overlays.find { it is MyLocationNewOverlay } as? MyLocationNewOverlay
                        myLocationOverlay?.let {
                            val userIcon = ContextCompat.getDrawable(context, userIconResId)
                            userIcon?.let { icon ->
                                it.setPersonIcon(icon.toBitmap())
                                it.setDirectionIcon(icon.toBitmap())
                            }
                        }
                    }

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
                        
                        // Set custom professional icon
                        val iconRes = if (isReached) R.drawable.ic_waypoint_reached else R.drawable.ic_waypoint
                        marker.icon = ContextCompat.getDrawable(context, iconRes)
                        marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        
                        mapView.overlays.add(marker)
                    }
                    
                    mapView.invalidate()
                }
            )
            
            // UI Overlay for Race Info
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (isRaceStarted) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Tiempo: ${formatElapsedTime(elapsedTime)}",
                                        style = MaterialTheme.typography.titleLarge
                                    )
                                    Text(
                                        text = "Waypoints: ${reachedWaypoints.size} / ${waypoints.size}",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilledTonalButton(onClick = { viewModel.togglePause() }) {
                                        Text(if (isPaused) "REANUDAR" else "PAUSAR")
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = { viewModel.stopRace() },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                            ) {
                                Text("TERMINAR CARRERA")
                            }
                        }
                    }
                } else {
                    Button(
                        onClick = { viewModel.startRace() },
                        modifier = Modifier.fillMaxWidth().height(56.dp)
                    ) {
                        Text("DAR INICIO A LA CARRERA", style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }
}
