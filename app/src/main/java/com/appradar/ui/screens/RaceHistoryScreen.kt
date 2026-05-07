package com.appradar.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.ui.viewmodel.HistoryViewModel
import com.appradar.ui.viewmodel.RunDetails
import com.appradar.util.formatElapsedTime
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RaceHistoryScreen(
    navController: NavController,
    viewModel: HistoryViewModel = hiltViewModel()
) {
    val runs by viewModel.raceRuns.collectAsState(initial = emptyList())

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Historial de Carreras") })
        }
    ) { padding ->
        if (runs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No hay carreras registradas.")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(runs) { run ->
                    RaceRunItem(
                        run = run,
                        viewModel = viewModel,
                        onDelete = { viewModel.deleteRun(run.runUuid) }
                    )
                }
            }
        }
    }
}

@Composable
fun RaceRunItem(
    run: RaceRunEntity,
    viewModel: HistoryViewModel,
    onDelete: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val details by viewModel.getRunDetails(run).collectAsState(initial = null)
    val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()) }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = run.trailName, style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "Fecha: ${dateFormat.format(Date(run.startTime))}",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "Tiempo Total: ${formatElapsedTime(run.totalTime)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (!run.isCompleted) {
                        Text(
                            text = "Incompleta",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
                Row {
                    IconButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Eliminar",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                    Icon(
                        imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (expanded) "Ver menos" else "Ver más",
                        modifier = Modifier.align(Alignment.CenterVertically)
                    )
                }
            }

            AnimatedVisibility(visible = expanded) {
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    Divider()
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Waypoints Alcanzados:",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    
                    if (details != null && details!!.reachedWaypoints.isNotEmpty()) {
                        details!!.reachedWaypoints.forEach { (waypoint, track) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = waypoint.name.ifBlank { "Waypoint sin nombre" },
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = formatElapsedTime(track.timeFromStart),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.outline
                                )
                            }
                        }
                    } else if (details != null) {
                        Text(
                            text = "Ningún waypoint alcanzado.",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    } else {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .size(24.dp)
                                .align(Alignment.CenterHorizontally)
                        )
                    }
                }
            }
        }
    }
}
