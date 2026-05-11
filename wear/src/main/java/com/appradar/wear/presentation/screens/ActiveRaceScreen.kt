package com.appradar.wear.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.appradar.wear.presentation.viewmodel.ActiveRaceViewModel
import java.util.Locale
import java.util.concurrent.TimeUnit

@Composable
fun ActiveRaceScreen(
    trailUuid: String,
    onNavigateBack: () -> Unit,
    viewModel: ActiveRaceViewModel = hiltViewModel()
) {
    val trail by viewModel.trail.collectAsState()
    val elapsedTime by viewModel.elapsedTimeMillis.collectAsState()
    val reachedWaypoints by viewModel.reachedWaypoints.collectAsState()
    val waypoints by viewModel.waypoints.collectAsState()
    val isRaceStarted by viewModel.isRaceStarted.collectAsState()
    val isPaused by viewModel.isPaused.collectAsState()
    val nextDistance by viewModel.nextWaypointDistance.collectAsState()

    LaunchedEffect(trailUuid) { viewModel.loadTrail(trailUuid) }

    val listState = rememberScalingLazyListState()

    Scaffold(
        timeText = { if (!isRaceStarted) TimeText() },
        vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) }
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            contentPadding = PaddingValues(top = 32.dp, bottom = 40.dp, start = 8.dp, end = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Text(
                    text = trail?.name ?: "Cargando...",
                    style = MaterialTheme.typography.caption2,
                    textAlign = TextAlign.Center,
                    maxLines = 1
                )
            }

            item {
                Text(
                    text = formatTime(elapsedTime),
                    fontSize = 32.sp,
                    textAlign = TextAlign.Center,
                    color = if (isPaused) MaterialTheme.colors.secondary else MaterialTheme.colors.primary
                )
            }

            item {
                Text(
                    text = "${reachedWaypoints.size} / ${waypoints.size} WP",
                    style = MaterialTheme.typography.body1,
                    textAlign = TextAlign.Center
                )
            }

            if (isRaceStarted && nextDistance != null) {
                item {
                    val distText = if (nextDistance!! < 1000)
                        "${nextDistance!!.toInt()} m"
                    else
                        "${"%.1f".format(nextDistance!! / 1000)} km"
                    Text(
                        text = "Siguiente: $distText",
                        style = MaterialTheme.typography.caption2,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colors.secondaryVariant
                    )
                }
            }

            if (!isRaceStarted) {
                item {
                    Button(
                        onClick = { viewModel.startRace() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("INICIAR")
                    }
                }
            } else {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CompactButton(
                            onClick = { viewModel.togglePause() },
                            colors = ButtonDefaults.buttonColors(
                                backgroundColor = MaterialTheme.colors.surface
                            )
                        ) {
                            Text(if (isPaused) "▶" else "II", fontSize = 14.sp)
                        }
                        CompactButton(
                            onClick = {
                                viewModel.stopRace()
                                onNavigateBack()
                            },
                            colors = ButtonDefaults.buttonColors(
                                backgroundColor = Color(0xFFB71C1C)
                            )
                        ) {
                            Text("■", fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}

private fun formatTime(millis: Long): String {
    val h = TimeUnit.MILLISECONDS.toHours(millis)
    val m = TimeUnit.MILLISECONDS.toMinutes(millis) % 60
    val s = TimeUnit.MILLISECONDS.toSeconds(millis) % 60
    return String.format(Locale.getDefault(), "%02d:%02d:%02d", h, m, s)
}
