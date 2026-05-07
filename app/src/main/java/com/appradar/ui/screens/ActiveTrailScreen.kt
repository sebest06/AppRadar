package com.appradar.ui.screens

import android.Manifest
import android.content.pm.PackageManager
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
import androidx.navigation.NavController
import com.appradar.data.mock.MockData
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveTrailScreen(navController: NavController) {
    val context = LocalContext.current
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

    LaunchedEffect(Unit) {
        // Inicializar OSMDroid con el paquete de la aplicación
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

    val firstWaypoint = MockData.mockWaypoints.first()
    val initialPos = GeoPoint(firstWaypoint.latitude, firstWaypoint.longitude)

    val reachedWaypoints = remember { mutableStateListOf<String>() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(MockData.mockTrail.name) },
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
                        controller.setZoom(14.0)
                        controller.setCenter(initialPos)

                        // Activar capa de mi ubicación si hay permisos
                        if (hasLocationPermission) {
                            val myLocationOverlay = MyLocationNewOverlay(GpsMyLocationProvider(ctx), this)
                            myLocationOverlay.enableMyLocation()
                            overlays.add(myLocationOverlay)
                        }

                        // Agregar marcadores de waypoints
                        MockData.mockWaypoints.forEach { wp ->
                            val marker = Marker(this)
                            marker.position = GeoPoint(wp.latitude, wp.longitude)
                            marker.title = "Waypoint"
                            // OSMDroid usa recursos drawables para íconos, por defecto es un pin gris/azul.
                            // Si queremos cambiar color en runtime, podemos usar setIcon o filtros.
                            // Por ahora dejamos el pin por defecto.
                            overlays.add(marker)
                        }
                    }
                },
                update = { mapView ->
                    // Aquí actualizaríamos el mapa cuando el estado cambie (ej: color de markers)
                    mapView.overlays.filterIsInstance<Marker>().forEachIndexed { index, marker ->
                        val wp = MockData.mockWaypoints[index]
                        if (reachedWaypoints.contains(wp.waypointUuid)) {
                            marker.title = "Alcanzado"
                            // Cambiar color o ícono si se desea (requiere Drawable)
                        }
                    }
                    mapView.invalidate()
                }
            )
            
            // Botón flotante para simular llegada a waypoints
            Button(
                onClick = { 
                    val nextWp = MockData.mockWaypoints.find { !reachedWaypoints.contains(it.waypointUuid) }
                    if (nextWp != null) reachedWaypoints.add(nextWp.waypointUuid)
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            ) {
                Text("Simular: Pasar Waypoint")
            }
        }
    }
}
