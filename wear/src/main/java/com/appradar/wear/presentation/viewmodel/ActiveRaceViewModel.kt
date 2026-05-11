package com.appradar.wear.presentation.viewmodel

import android.app.Application
import android.content.Intent
import android.location.Location
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.wear.data.local.entity.WearTrackEntity
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity
import com.appradar.wear.data.repository.WearRepository
import com.appradar.wear.service.WearTrackingService
import com.appradar.wear.util.WearUserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class ActiveRaceViewModel @Inject constructor(
    application: Application,
    private val repository: WearRepository,
    private val userPreferences: WearUserPreferences
) : AndroidViewModel(application) {

    private val _trail = MutableStateFlow<WearTrailEntity?>(null)
    val trail: StateFlow<WearTrailEntity?> = _trail

    private val _waypoints = MutableStateFlow<List<WearWaypointEntity>>(emptyList())
    val waypoints: StateFlow<List<WearWaypointEntity>> = _waypoints

    private val _reachedWaypoints = MutableStateFlow<Set<String>>(emptySet())
    val reachedWaypoints: StateFlow<Set<String>> = _reachedWaypoints

    private val _isRaceStarted = MutableStateFlow(false)
    val isRaceStarted: StateFlow<Boolean> = _isRaceStarted

    private val _isPaused = MutableStateFlow(false)
    val isPaused: StateFlow<Boolean> = _isPaused

    private val _elapsedTimeMillis = MutableStateFlow(0L)
    val elapsedTimeMillis: StateFlow<Long> = _elapsedTimeMillis

    private val _nextWaypointDistance = MutableStateFlow<Float?>(null)
    val nextWaypointDistance: StateFlow<Float?> = _nextWaypointDistance

    private val _currentLocation = MutableStateFlow<Location?>(null)
    val currentLocation: StateFlow<Location?> = _currentLocation

    private var currentRunUuid: String = ""
    private var lastStartTimeMillis: Long = 0L
    private var accumulatedTimeMillis: Long = 0L
    private var timerJob: Job? = null
    private var locationJob: Job? = null

    fun loadTrail(trailUuid: String) {
        viewModelScope.launch {
            _trail.value = repository.getTrailById(trailUuid)
            repository.getWaypointsForTrail(trailUuid).collect { _waypoints.value = it }
        }
        // Iniciar GPS desde el principio para que el mapa muestre posición antes de arrancar
        startGpsPreview()
    }

    private fun startGpsPreview() {
        val ctx = getApplication<Application>()
        ctx.startForegroundService(Intent(ctx, WearTrackingService::class.java))
        locationJob = viewModelScope.launch {
            WearTrackingService.locationFlow.collect { location ->
                _currentLocation.value = location
                if (_isRaceStarted.value && !_isPaused.value) onLocationUpdate(location)
            }
        }
    }

    fun startRace() {
        if (_isRaceStarted.value) return
        _isRaceStarted.value = true
        _isPaused.value = false
        _reachedWaypoints.value = emptySet()
        currentRunUuid = UUID.randomUUID().toString()
        lastStartTimeMillis = System.currentTimeMillis()
        accumulatedTimeMillis = 0L
        startTimer()
    }

    fun stopRace() {
        if (!_isRaceStarted.value) return
        timerJob?.cancel()
        val finalTime = elapsed()
        _elapsedTimeMillis.value = finalTime
        _isRaceStarted.value = false
        _isPaused.value = false
        viewModelScope.launch { repository.uploadUnsyncedTracks() }
    }

    fun togglePause() {
        if (!_isRaceStarted.value) return
        if (_isPaused.value) {
            _isPaused.value = false
            lastStartTimeMillis = System.currentTimeMillis()
            startTimer()
        } else {
            _isPaused.value = true
            timerJob?.cancel()
            accumulatedTimeMillis += System.currentTimeMillis() - lastStartTimeMillis
            _elapsedTimeMillis.value = accumulatedTimeMillis
        }
    }

    private fun onLocationUpdate(location: Location) {
        _currentLocation.value = location
        val wps = _waypoints.value
        val reached = _reachedWaypoints.value.toMutableSet()
        val maxSkip = _trail.value?.maxSkip ?: 0
        val startIndex = reached.size

        if (startIndex < wps.size) {
            _nextWaypointDistance.value = distanceBetween(
                location.latitude, location.longitude,
                wps[startIndex].latitude, wps[startIndex].longitude
            )
        }

        val limitIndex = (startIndex + maxSkip).coerceAtMost(wps.size - 1)
        for (i in startIndex..limitIndex) {
            val wp = wps[i]
            if (distanceBetween(location.latitude, location.longitude, wp.latitude, wp.longitude) <= wp.radiusInMeters) {
                val currentTime = elapsed()
                for (j in startIndex..i) {
                    val wpj = wps[j]
                    if (!reached.contains(wpj.waypointUuid)) {
                        reached.add(wpj.waypointUuid)
                        saveWaypointReached(wpj.waypointUuid, currentTime)
                    }
                }
                _reachedWaypoints.value = reached
                if (reached.size == wps.size) finishRace(currentTime)
                break
            }
        }
    }

    private fun distanceBetween(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Float {
        val result = FloatArray(1)
        Location.distanceBetween(lat1, lon1, lat2, lon2, result)
        return result[0]
    }

    private fun finishRace(finalTime: Long) {
        timerJob?.cancel()
        _isRaceStarted.value = false
        viewModelScope.launch { repository.uploadUnsyncedTracks() }
    }

    private fun saveWaypointReached(waypointUuid: String, timeFromStart: Long) {
        viewModelScope.launch {
            val userUuid = userPreferences.userUuid.firstOrNull() ?: ""
            repository.saveTrack(
                WearTrackEntity(
                    trackUuid = UUID.randomUUID().toString(),
                    trailUuid = _trail.value?.trailUuid ?: "",
                    runUuid = currentRunUuid,
                    userUuid = userUuid,
                    waypointUuid = waypointUuid,
                    timestamp = System.currentTimeMillis(),
                    timeFromStart = timeFromStart
                )
            )
        }
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                _elapsedTimeMillis.value = elapsed()
                delay(1000)
            }
        }
    }

    private fun elapsed(): Long =
        if (_isPaused.value) accumulatedTimeMillis
        else accumulatedTimeMillis + (System.currentTimeMillis() - lastStartTimeMillis)

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        locationJob?.cancel()
        val ctx = getApplication<Application>()
        ctx.stopService(Intent(ctx, WearTrackingService::class.java))
    }
}
