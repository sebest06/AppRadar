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

    fun onFileSelected(context: Context, uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            context.contentResolver.openInputStream(uri)?.use {
                val data = GpxParser.parse(it)
                _previewData.value = data
            }
        }
    }

    fun createRace(raceName: String, onComplete: () -> Unit) {
        val data = _previewData.value ?: return
        viewModelScope.launch(Dispatchers.IO) {
            val trailUuid = UUID.randomUUID().toString()
            val trail = TrailEntity(
                trailUuid = trailUuid,
                carreraId = UUID.randomUUID().toString(),
                name = raceName,
                timestamp = System.currentTimeMillis()
            )

            val pathPoints = data.trackPoints.mapIndexed { index, point ->
                PathPointEntity(
                    trailUuid = trailUuid,
                    latitude = point.latitude,
                    longitude = point.longitude,
                    order = index
                )
            }

            val waypoints = data.waypoints.map { pt ->
                WaypointEntity(
                    waypointUuid = UUID.randomUUID().toString(),
                    trailUuid = trailUuid,
                    name = pt.name ?: "Waypoint",
                    latitude = pt.latitude,
                    longitude = pt.longitude,
                    radiusInMeters = 10f
                )
            }

            repository.saveTrail(trail)
            repository.savePathPoints(pathPoints)
            repository.saveWaypoints(waypoints)
            
            launch(Dispatchers.Main) {
                onComplete()
            }
        }
    }
}
