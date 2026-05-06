package com.appradar.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.appradar.data.mock.MockData
import com.appradar.ui.navigation.Screen
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveTrailScreen(navController: NavController) {
    // Usaremos el primer waypoint mockeado como centro inicial de la cámara
    val firstWaypoint = MockData.mockWaypoints.first()
    val initialPos = LatLng(firstWaypoint.latitude, firstWaypoint.longitude)
    
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(initialPos, 14f)
    }

    // Estado simulado: IDs de waypoints ya pasados
    val reachedWaypoints = remember { mutableStateListOf<String>() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(MockData.mockTrail.name) },
                actions = {
                    Button(onClick = { navController.navigate(Screen.Leaderboard.route) }) {
                        Text("Ranking")
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState
            ) {
                // Dibujamos los waypoints en el mapa
                MockData.mockWaypoints.forEach { wp ->
                    val isReached = reachedWaypoints.contains(wp.waypointUuid)
                    val color = if (isReached) 
                        com.google.android.gms.maps.model.BitmapDescriptorFactory.HUE_GREEN 
                    else 
                        com.google.android.gms.maps.model.BitmapDescriptorFactory.HUE_RED

                    Marker(
                        state = MarkerState(position = LatLng(wp.latitude, wp.longitude)),
                        title = "Waypoint",
                        icon = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(color),
                        onClick = {
                            // Simulación: Al tocar el marcador, se marca como alcanzado
                            if (!isReached) {
                                reachedWaypoints.add(wp.waypointUuid)
                            }
                            false
                        }
                    )
                }
            }
            
            // Botón flotante para simular llegada a waypoints
            Button(
                onClick = { 
                    val nextWp = MockData.mockWaypoints.find { !reachedWaypoints.contains(it.waypointUuid) }
                    if (nextWp != null) reachedWaypoints.add(nextWp.waypointUuid)
                },
                modifier = Modifier
                    .align(androidx.compose.ui.Alignment.BottomCenter)
                    .padding(16.dp)
            ) {
                Text("Simular: Pasar Waypoint")
            }
        }
    }
}
