package com.appradar.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.repository.RadarRepository
import com.appradar.util.GpxData
import com.appradar.util.GpxParser
import com.appradar.util.GpxPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class CreateRaceViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    private val _previewData = MutableStateFlow<GpxData?>(null)
    val previewData: StateFlow<GpxData?> = _previewData

    private val _generatedWaypoints = MutableStateFlow<List<WaypointEntity>>(emptyList())
    val generatedWaypoints: StateFlow<List<WaypointEntity>> = _generatedWaypoints

    fun onFileSelected(context: Context, uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            context.contentResolver.openInputStream(uri)?.use {
                val data = GpxParser.parse(it)
                _previewData.value = data
                // Reset generated waypoints
                _generatedWaypoints.value = emptyList()
            }
        }
    }

    fun updateWaypointCount(count: Int) {
        val data = _previewData.value ?: return
        if (count <= 0) {
            _generatedWaypoints.value = emptyList()
            return
        }
        viewModelScope.launch(Dispatchers.Default) {
            val waypoints = generateWaypoints(data.trackPoints, count, "")
            _generatedWaypoints.value = waypoints
        }
    }

    fun createRace(
        raceName: String,
        numWaypoints: Int,
        maxSkip: Int,
        onComplete: () -> Unit
    ) {
        val data = _previewData.value ?: return
        viewModelScope.launch(Dispatchers.IO) {
            val trailUuid = UUID.randomUUID().toString()
            val trail = TrailEntity(
                trailUuid = trailUuid,
                name = raceName,
                timestamp = System.currentTimeMillis(),
                maxSkip = maxSkip
            )

            val pathPoints = data.trackPoints.mapIndexed { index, point ->
                PathPointEntity(
                    trailUuid = trailUuid,
                    latitude = point.latitude,
                    longitude = point.longitude,
                    order = index
                )
            }

            // Generar waypoints automáticos si se solicita
            val generatedWaypoints = if (numWaypoints > 0) {
                generateWaypoints(data.trackPoints, numWaypoints, trailUuid)
            } else {
                data.waypoints.map { pt ->
                    WaypointEntity(
                        waypointUuid = UUID.randomUUID().toString(),
                        trailUuid = trailUuid,
                        name = pt.name ?: "Waypoint",
                        latitude = pt.latitude,
                        longitude = pt.longitude,
                        radiusInMeters = 50f
                    )
                }
            }

            repository.saveTrail(trail)
            repository.savePathPoints(pathPoints)
            repository.saveWaypoints(generatedWaypoints)
            
            launch(Dispatchers.Main) {
                onComplete()
            }
        }
    }

    private fun generateWaypoints(
        points: List<GpxPoint>,
        count: Int,
        trailUuid: String
    ): List<WaypointEntity> {
        if (points.size < 2) return emptyList()

        // 1. Calcular distancias acumuladas
        val distances = mutableListOf<Double>()
        distances.add(0.0)
        var totalDistance = 0.0
        for (i in 0 until points.size - 1) {
            val results = FloatArray(1)
            android.location.Location.distanceBetween(
                points[i].latitude, points[i].longitude,
                points[i + 1].latitude, points[i + 1].longitude,
                results
            )
            totalDistance += results[0]
            distances.add(totalDistance)
        }

        val waypointList = mutableListOf<WaypointEntity>()
        val interval = totalDistance / count

        // 2. Interpolar puntos a distancias fijas
        for (i in 1..count) {
            val targetDistance = interval * i
            
            // Encontrar el segmento donde cae targetDistance
            var segmentIndex = distances.binarySearch(targetDistance)
            if (segmentIndex < 0) {
                segmentIndex = -(segmentIndex + 1) - 1
            }
            
            if (segmentIndex >= points.size - 1) {
                // El último punto
                val last = points.last()
                waypointList.add(createWaypoint(last.latitude, last.longitude, i, trailUuid))
                continue
            }

            val p1 = points[segmentIndex]
            val p2 = points[segmentIndex + 1]
            val d1 = distances[segmentIndex]
            val d2 = distances[segmentIndex + 1]
            
            val ratio = (targetDistance - d1) / (d2 - d1)
            val lat = p1.latitude + (p2.latitude - p1.latitude) * ratio
            val lon = p1.longitude + (p2.longitude - p1.longitude) * ratio
            
            waypointList.add(createWaypoint(lat, lon, i, trailUuid))
        }

        return waypointList
    }

    private fun createWaypoint(lat: Double, lon: Double, index: Int, trailUuid: String): WaypointEntity {
        return WaypointEntity(
            waypointUuid = UUID.randomUUID().toString(),
            trailUuid = trailUuid,
            name = "Waypoint $index",
            latitude = lat,
            longitude = lon,
            radiusInMeters = 50f
        )
    }
}
