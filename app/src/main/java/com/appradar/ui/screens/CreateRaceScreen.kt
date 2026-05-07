package com.appradar.ui.screens

import android.graphics.Color
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.ui.viewmodel.CreateRaceViewModel
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateRaceScreen(
    navController: NavController,
    viewModel: CreateRaceViewModel = hiltViewModel()
) {
    var raceName by remember { mutableStateOf("") }
    val previewData by viewModel.previewData.collectAsState()
    val context = LocalContext.current

    val gpxPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
        onResult = { uri -> 
            uri?.let { viewModel.onFileSelected(context, it) }
        }
    )

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Crear Carrera") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            OutlinedTextField(
                value = raceName,
                onValueChange = { raceName = it },
                label = { Text("Nombre de la Carrera") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { gpxPicker.launch(arrayOf("*/*")) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (previewData == null) "Seleccionar archivo GPX" else "Cambiar archivo GPX")
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (previewData != null) {
                Text("Vista previa:", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))
                
                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx ->
                            MapView(ctx).apply {
                                setMultiTouchControls(true)
                                controller.setZoom(13.0)
                            }
                        },
                        update = { mapView ->
                            mapView.overlays.clear()
                            val data = previewData ?: return@AndroidView
                            
                            // Draw Path
                            if (data.trackPoints.isNotEmpty()) {
                                val polyline = Polyline()
                                polyline.setPoints(data.trackPoints.map { GeoPoint(it.latitude, it.longitude) })
                                polyline.outlinePaint.color = Color.RED
                                polyline.outlinePaint.strokeWidth = 4f
                                mapView.overlays.add(polyline)
                                
                                // Center on first point
                                mapView.controller.setCenter(GeoPoint(data.trackPoints.first().latitude, data.trackPoints.first().longitude))
                            }

                            // Add Waypoint markers
                            data.waypoints.forEach { wp ->
                                val marker = Marker(mapView)
                                marker.position = GeoPoint(wp.latitude, wp.longitude)
                                marker.title = wp.name ?: "Waypoint"
                                mapView.overlays.add(marker)
                            }
                            mapView.invalidate()
                        }
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                Text("Track: ${previewData?.trackPoints?.size} puntos")
                Text("Waypoints detectados: ${previewData?.waypoints?.size}")
            } else {
                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    Text("Selecciona un archivo para ver la vista previa")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (raceName.isNotBlank() && previewData != null) {
                        viewModel.createRace(raceName) {
                            navController.popBackStack()
                        }
                    }
                },
                enabled = raceName.isNotBlank() && previewData != null,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Guardar Carrera")
            }
        }
    }
}
