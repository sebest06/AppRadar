package com.appradar.ui.viewmodel

import android.location.Location
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.repository.RadarRepository
import com.appradar.util.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class ActiveTrailViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    private val _trail = MutableStateFlow<TrailEntity?>(null)
    val trail: StateFlow<TrailEntity?> = _trail

    private val _waypoints = MutableStateFlow<List<WaypointEntity>>(emptyList())
    val waypoints: StateFlow<List<WaypointEntity>> = _waypoints

    private val _pathPoints = MutableStateFlow<List<PathPointEntity>>(emptyList())
    val pathPoints: StateFlow<List<PathPointEntity>> = _pathPoints

    private val _reachedWaypoints = MutableStateFlow<Set<String>>(emptySet())
    val reachedWaypoints: StateFlow<Set<String>> = _reachedWaypoints

    fun loadTrail(trailUuid: String) {
        viewModelScope.launch {
            _trail.value = repository.getTrailById(trailUuid)
            repository.getWaypointsForTrail(trailUuid).collect {
                _waypoints.value = it
            }
        }
        viewModelScope.launch {
            repository.getPathPointsForTrail(trailUuid).collect {
                _pathPoints.value = it
            }
        }
    }

    fun onLocationUpdate(location: Location) {
        val currentWaypoints = _waypoints.value
        val reached = _reachedWaypoints.value.toMutableSet()

        currentWaypoints.forEach { wp ->
            if (!reached.contains(wp.waypointUuid)) {
                if (LocationHelper.isWithinWaypointRadius(
                        currentLocation = location,
                        waypointLat = wp.latitude,
                        waypointLon = wp.longitude,
                        radiusInMeters = wp.radiusInMeters
                    )
                ) {
                    reached.add(wp.waypointUuid)
                    saveWaypointReached(wp.waypointUuid)
                }
            }
        }
        _reachedWaypoints.value = reached
    }

    private fun saveWaypointReached(waypointUuid: String) {
        viewModelScope.launch {
            val track = TrackEntity(
                trackUuid = UUID.randomUUID().toString(),
                trailUuid = _trail.value?.trailUuid ?: "",
                waypointUuid = waypointUuid,
                timestamp = System.currentTimeMillis()
            )
            repository.saveTrack(track)
        }
    }
}
