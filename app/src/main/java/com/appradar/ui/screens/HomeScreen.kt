package com.appradar.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.mock.MockData
import com.appradar.ui.navigation.Screen
import com.appradar.ui.viewmodel.HomeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val trails by viewModel.allTrails.collectAsState(initial = emptyList())
    val currentUser by viewModel.currentUser.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val activeTrailUuid by viewModel.activeTrailUuid.collectAsState(initial = null)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AppRadar") },
                actions = {
                    IconButton(onClick = { viewModel.refreshTrails() }, enabled = !isRefreshing) {
                        if (isRefreshing) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        } else {
                            Icon(Icons.Default.Refresh, contentDescription = "Sincronizar")
                        }
                    }
                    IconButton(onClick = { navController.navigate(Screen.RaceHistory.route) }) {
                        Icon(Icons.Default.List, contentDescription = "Historial")
                    }
                    IconButton(onClick = { navController.navigate(Screen.Settings.route) }) {
                        Icon(Icons.Filled.Settings, contentDescription = "Configuración")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { navController.navigate(Screen.CreateRace.route) }) {
                Icon(Icons.Default.Add, contentDescription = "Crear Carrera")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                text = "¡Hola, ${currentUser?.nombre ?: "Invitado"}!",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Tus Carreras",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(vertical = 16.dp)
            )

            activeTrailUuid?.let { uuid ->
                Card(
                    onClick = { navController.navigate(Screen.ActiveTrail.createRoute(uuid)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                "Carrera en curso",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                "Toca para reanudar",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                            )
                        }
                    }
                }
            }

            if (trails.isEmpty() && activeTrailUuid == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No hay carreras guardadas. ¡Crea una!")
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(trails) { trail ->
                        TrailItem(trail) {
                            navController.navigate(Screen.ActiveTrail.createRoute(trail.trailUuid))
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrailItem(trail: TrailEntity, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = trail.name, style = MaterialTheme.typography.titleMedium)
            Text(
                text = "${trail.distanceKm} km | ${trail.elevationM} m+",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
