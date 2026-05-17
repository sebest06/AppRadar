package com.appradar.wear.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.ui.res.painterResource
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.appradar.wear.presentation.viewmodel.TrailListViewModel

@Composable
fun TrailListScreen(
    onNavigateToRace: (String) -> Unit,
    viewModel: TrailListViewModel = hiltViewModel()
) {
    val trails by viewModel.trails.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val activeTrailUuid by viewModel.activeTrailUuid.collectAsState()
    val userName by viewModel.userName.collectAsState()
    val listState = rememberScalingLazyListState()

    Scaffold(
        timeText = { TimeText() },
        vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) }
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            contentPadding = PaddingValues(top = 36.dp, bottom = 32.dp, start = 8.dp, end = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Text(
                    text = if (userName != null) "Hola, $userName" else "Carreras",
                    style = MaterialTheme.typography.title3,
                    textAlign = TextAlign.Center
                )
            }

            activeTrailUuid?.let { uuid ->
                item {
                    Chip(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        onClick = { onNavigateToRace(uuid) },
                        label = { Text("Carrera en curso") },
                        colors = ChipDefaults.gradientBackgroundChipColors(
                            startBackgroundColor = MaterialTheme.colors.primary,
                            endBackgroundColor = MaterialTheme.colors.secondary
                        ),
                        icon = { Icon(painterResource(android.R.drawable.ic_media_play), contentDescription = null) }
                    )
                }
            }

            when {
                isLoading -> item {
                    CircularProgressIndicator(modifier = Modifier.padding(top = 8.dp))
                }
                trails.isEmpty() -> item {
                    Text(
                        text = error ?: "No hay carreras disponibles.\nConecta con el teléfono.",
                        style = MaterialTheme.typography.body2,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )
                }
                else -> {
                    error?.let {
                        item {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.caption3,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colors.error
                            )
                        }
                    }
                    items(trails) { trail ->
                        Chip(
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onNavigateToRace(trail.trailUuid) },
                            label = {
                                Text(trail.name, maxLines = 1)
                            },
                            secondaryLabel = {
                                Text("%.1f km".format(trail.distanceKm), maxLines = 1)
                            }
                        )
                    }
                }
            }
        }
    }
}
