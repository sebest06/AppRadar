package com.appradar.wear.presentation.screens

import android.location.Location
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.appradar.wear.data.local.entity.WearWaypointEntity
import com.appradar.wear.presentation.viewmodel.ActiveRaceViewModel
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.cos

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
    val isCompleted by viewModel.isCompleted.collectAsState()
    val isAbandoned by viewModel.isAbandoned.collectAsState()
    val nextDistance by viewModel.nextWaypointDistance.collectAsState()
    val currentLocation by viewModel.currentLocation.collectAsState()
    val tracks by viewModel.tracks.collectAsState()
    val error by viewModel.error.collectAsState()

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

            // Mapa de waypoints
            item {
                WearMap(
                    currentLocation = currentLocation,
                    waypoints = waypoints,
                    reachedWaypoints = reachedWaypoints,
                    modifier = Modifier
                        .size(160.dp)
                        .clip(CircleShape)
                )
            }

            item {
                Text(
                    text = formatTime(elapsedTime),
                    fontSize = 28.sp,
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

            // Waypoints y tiempos
            if (waypoints.isNotEmpty()) {
                item {
                    Text(
                        text = "Waypoints",
                        style = MaterialTheme.typography.caption1,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                    )
                }
                
                items(waypoints.size) { index ->
                    val wp = waypoints[index]
                    val track = tracks.find { it.waypointUuid == wp.waypointUuid }
                    val isReached = track != null
                    
                    Chip(
                        onClick = { },
                        label = {
                            Text(
                                text = wp.name.ifEmpty { "WP ${index + 1}" },
                                overflow = TextOverflow.Ellipsis,
                                maxLines = 1
                            )
                        },
                        secondaryLabel = {
                            Text(
                                text = if (isReached) formatTime(track!!.timeFromStart) else "--:--:--",
                                color = if (isReached) Color(0xFF4CAF50) else MaterialTheme.colors.onSurface.copy(alpha = 0.6f)
                            )
                        },
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                        enabled = false
                    )
                }
            }

            if (!isRaceStarted) {
                if (isCompleted || isAbandoned) {
                    item {
                        Text(
                            text = if (isCompleted) "¡COMPLETADA!" else "ABANDONADA",
                            style = MaterialTheme.typography.button,
                            color = if (isCompleted) Color(0xFF4CAF50) else Color(0xFFB71C1C),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                    item {
                        Button(
                            onClick = { onNavigateBack() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("SALIR")
                        }
                    }
                } else {
                    error?.let {
                        item {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.caption3,
                                color = MaterialTheme.colors.error,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(horizontal = 10.dp)
                            )
                        }
                    }
                    item {
                        Button(
                            onClick = { viewModel.startRace() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (elapsedTime > 0) "REANUDAR" else "INICIAR")
                        }
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

@Composable
private fun WearMap(
    currentLocation: Location?,
    waypoints: List<WearWaypointEntity>,
    reachedWaypoints: Set<String>,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val cx = size.width / 2f
        val cy = size.height / 2f

        // Fondo oscuro
        drawCircle(Color(0xFF1A1A2E), radius = size.minDimension / 2f)

        if (waypoints.isEmpty()) {
            drawCircle(Color(0xFF6750A4).copy(alpha = 0.3f), radius = 20f, center = Offset(cx, cy))
            return@Canvas
        }

        // Si no hay GPS aún, centrar en el primer waypoint para mostrar la ruta
        val refLat = currentLocation?.latitude ?: waypoints.first().latitude
        val refLon = currentLocation?.longitude ?: waypoints.first().longitude

        val padding = size.minDimension * 0.12f
        val mapRadius = size.minDimension / 2f - padding

        // Escala: la distancia máxima desde el punto de referencia a cualquier waypoint
        val maxDist = waypoints.maxOf { wp ->
            val dLat = (wp.latitude - refLat) * 111320.0
            val dLon = (wp.longitude - refLon) * 111320.0 * cos(Math.toRadians(refLat))
            Math.hypot(dLat, dLon).toFloat()
        }.coerceAtLeast(100f)  // mínimo 100m de escala
        val scale = mapRadius / maxDist

        fun toOffset(lat: Double, lon: Double): Offset {
            val dLat = (lat - refLat) * 111320.0
            val dLon = (lon - refLon) * 111320.0 * cos(Math.toRadians(refLat))
            return Offset(
                (cx + dLon * scale).toFloat(),
                (cy - dLat * scale).toFloat()
            )
        }

        // Línea de ruta entre waypoints
        for (i in 0 until waypoints.size - 1) {
            val from = toOffset(waypoints[i].latitude, waypoints[i].longitude)
            val to = toOffset(waypoints[i + 1].latitude, waypoints[i + 1].longitude)
            drawLine(
                color = Color.Gray.copy(alpha = 0.5f),
                start = from,
                end = to,
                strokeWidth = 1.5f,
                cap = StrokeCap.Round
            )
        }

        // Waypoints
        val nextIndex = reachedWaypoints.size
        waypoints.forEachIndexed { i, wp ->
            val pos = toOffset(wp.latitude, wp.longitude)
            val isReached = reachedWaypoints.contains(wp.waypointUuid)
            val isNext = i == nextIndex

            val color = when {
                isReached -> Color(0xFF4CAF50)  // verde: alcanzado
                isNext    -> Color(0xFFFFEB3B)  // amarillo: siguiente objetivo
                else      -> Color(0xFF9E9E9E)  // gris: pendiente
            }
            val dotRadius = if (isNext) 8.dp.toPx() else 5.dp.toPx()

            if (isNext) {
                // Halo pulsante del objetivo siguiente
                drawCircle(color.copy(alpha = 0.2f), radius = dotRadius * 2.5f, center = pos)
            }
            drawCircle(color, radius = dotRadius, center = pos)
        }

        // Posición actual del corredor
        if (currentLocation != null) {
            drawCircle(Color(0xFF2196F3).copy(alpha = 0.25f), radius = 14.dp.toPx(), center = Offset(cx, cy))
            drawCircle(Color(0xFF2196F3), radius = 7.dp.toPx(), center = Offset(cx, cy))
            drawCircle(Color.White, radius = 2.5.dp.toPx(), center = Offset(cx, cy))
        } else {
            // Sin GPS: punto gris con indicador
            drawCircle(Color.DarkGray, radius = 6.dp.toPx(), center = Offset(cx, cy))
        }
    }
}

private fun formatTime(millis: Long): String {
    val h = TimeUnit.MILLISECONDS.toHours(millis)
    val m = TimeUnit.MILLISECONDS.toMinutes(millis) % 60
    val s = TimeUnit.MILLISECONDS.toSeconds(millis) % 60
    return String.format(Locale.getDefault(), "%02d:%02d:%02d", h, m, s)
}
