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
import kotlinx.coroutines.ExperimentalCoroutinesApi
import java.util.UUID
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
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

    private val _runUuid = MutableStateFlow<String?>(null)
    
    val tracks: StateFlow<List<WearTrackEntity>> = _runUuid
        .filterNotNull()
        .flatMapLatest { repository.getTracksForRun(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val reachedWaypoints: StateFlow<Set<String>> = tracks
        .map { it.map { track -> track.waypointUuid }.toSet() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    private val _isRaceStarted = MutableStateFlow(false)
    val isRaceStarted: StateFlow<Boolean> = _isRaceStarted

    private val _isPaused = MutableStateFlow(false)
    val isPaused: StateFlow<Boolean> = _isPaused

    private val _isCompleted = MutableStateFlow(false)
    val isCompleted: StateFlow<Boolean> = _isCompleted

    private val _isAbandoned = MutableStateFlow(false)
    val isAbandoned: StateFlow<Boolean> = _isAbandoned

    private val _elapsedTimeMillis = MutableStateFlow(0L)
    val elapsedTimeMillis: StateFlow<Long> = _elapsedTimeMillis

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _nextWaypointDistance = MutableStateFlow<Float?>(null)
    val nextWaypointDistance: StateFlow<Float?> = _nextWaypointDistance

    private val _currentLocation = MutableStateFlow<Location?>(null)
    val currentLocation: StateFlow<Location?> = _currentLocation

    private var currentRunUuid: String = ""
    private var currentSessionUuid: String? = null
    private var initialStartTimeMillis: Long = 0L
    private var lastStartTimeMillis: Long = 0L
    private var accumulatedTimeMillis: Long = 0L
    private var timerJob: Job? = null
    private var locationJob: Job? = null

    fun loadTrail(trailUuid: String) {
        viewModelScope.launch {
            val trailEntity = repository.getTrailById(trailUuid)
            _trail.value = trailEntity
            
            // Cargar waypoints
            repository.getWaypointsForTrail(trailUuid).collect { _waypoints.value = it }
        }

        // Cargar último estado de carrera para este trail
        viewModelScope.launch {
            val lastRun = repository.getLastRunForTrail(trailUuid)
            if (lastRun != null) {
                _elapsedTimeMillis.value = lastRun.totalTime
                _isCompleted.value = lastRun.isCompleted
                _isAbandoned.value = lastRun.isAbandoned
                currentRunUuid = lastRun.runUuid
                _runUuid.value = lastRun.runUuid
            }
        }

        // Recuperar estado si ya hay una carrera activa en DataStore
        viewModelScope.launch {
            userPreferences.activeTrailUuid.firstOrNull()?.let { savedUuid ->
                if (savedUuid == trailUuid && !_isRaceStarted.value) {
                    val startTime = userPreferences.activeStartTime.firstOrNull() ?: 0L
                    val runUuid = userPreferences.activeRunUuid.firstOrNull()
                    if (startTime > 0 && runUuid != null) {
                        _isRaceStarted.value = true
                        _isCompleted.value = false
                        _isAbandoned.value = false
                        _runUuid.value = runUuid
                        currentRunUuid = runUuid
                        initialStartTimeMillis = startTime
                        lastStartTimeMillis = startTime
                        accumulatedTimeMillis = 0L
                        startTimer()
                    }
                }
            }
        }

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
        
        val trailEntity = _trail.value
        if (trailEntity == null) {
            _error.value = "Cargando datos..."
            return
        }

        viewModelScope.launch {
            _error.value = null
            val trailId = trailEntity.trailUuid
            val lastRun = repository.getLastRunForTrail(trailId)
            
            if (lastRun != null) {
                val diff = System.currentTimeMillis() - lastRun.startTime
                val oneHour = 3600_000L
                if (diff < oneHour) {
                    val remainingMs = oneHour - diff
                    val remainingMins = (remainingMs / 60_000L).coerceAtLeast(1)
                    _error.value = "Espera $remainingMins min"
                    return@launch
                }
            }

            _isRaceStarted.value = true
            _isPaused.value = false
            _isCompleted.value = false
            _isAbandoned.value = false
            currentRunUuid = UUID.randomUUID().toString()
            _runUuid.value = currentRunUuid
            initialStartTimeMillis = System.currentTimeMillis()
            lastStartTimeMillis = initialStartTimeMillis
            accumulatedTimeMillis = 0L
            currentSessionUuid = null

            val userUuid = userPreferences.userUuid.firstOrNull() ?: ""
            userPreferences.setActiveRace(trailId, currentRunUuid, initialStartTimeMillis)
            
            val run = com.appradar.wear.data.local.entity.WearRaceRunEntity(
                runUuid = currentRunUuid,
                trailUuid = trailId,
                userUuid = userUuid,
                trailName = _trail.value?.name ?: "Carrera",
                startTime = initialStartTimeMillis,
                isCompleted = false,
                isAbandoned = false
            )
            val sessionUuid = repository.saveRaceRun(run)
            currentSessionUuid = sessionUuid

            // Start tracking service
            val ctx = getApplication<Application>()
            val intent = Intent(ctx, WearTrackingService::class.java).apply {
                putExtra(WearTrackingService.EXTRA_TRAIL_UUID, trailId)
                putExtra(WearTrackingService.EXTRA_USER_UUID, userUuid)
                putExtra(WearTrackingService.EXTRA_SESSION_UUID, currentSessionUuid ?: "")
                putExtra(WearTrackingService.EXTRA_START_TIME, initialStartTimeMillis)
            }
            ctx.startForegroundService(intent)
            
            startTimer()
        }
    }

    fun stopRace() {
        if (!_isRaceStarted.value) return
        timerJob?.cancel()
        val finalTime = elapsed()
        _elapsedTimeMillis.value = finalTime
        _isRaceStarted.value = false
        _isPaused.value = false
        _isAbandoned.value = true
        
        // Detener servicio tracking
        val ctx = getApplication<Application>()
        ctx.stopService(Intent(ctx, WearTrackingService::class.java))

        viewModelScope.launch { 
            val userUuid = userPreferences.userUuid.firstOrNull() ?: ""
            val run = com.appradar.wear.data.local.entity.WearRaceRunEntity(
                runUuid = currentRunUuid,
                trailUuid = _trail.value?.trailUuid ?: "",
                userUuid = userUuid,
                trailName = _trail.value?.name ?: "Carrera",
                startTime = initialStartTimeMillis,
                endTime = System.currentTimeMillis(),
                totalTime = finalTime,
                isCompleted = false,
                isAbandoned = true,
                sessionUuid = currentSessionUuid
            )
            repository.saveRaceRun(run)
            
            userPreferences.setActiveRace(null, null, 0)
            repository.uploadUnsyncedData()
        }
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
        val reached = reachedWaypoints.value
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
                        saveWaypointReached(wpj.waypointUuid, currentTime)
                    }
                }
                if (reached.size + (i - startIndex + 1) == wps.size) finishRace(currentTime)
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
        _isCompleted.value = true

        // Detener servicio tracking
        val ctx = getApplication<Application>()
        ctx.stopService(Intent(ctx, WearTrackingService::class.java))

        viewModelScope.launch { 
            val userUuid = userPreferences.userUuid.firstOrNull() ?: ""
            val run = com.appradar.wear.data.local.entity.WearRaceRunEntity(
                runUuid = currentRunUuid,
                trailUuid = _trail.value?.trailUuid ?: "",
                userUuid = userUuid,
                trailName = _trail.value?.name ?: "Carrera",
                startTime = initialStartTimeMillis,
                endTime = System.currentTimeMillis(),
                totalTime = finalTime,
                isCompleted = true,
                isAbandoned = false,
                sessionUuid = currentSessionUuid
            )
            repository.saveRaceRun(run)
            
            userPreferences.setActiveRace(null, null, 0)
            repository.uploadUnsyncedData()
        }
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
                if (_isRaceStarted.value || repository.hasUnsyncedData()) {
                    repository.uploadUnsyncedData()
                }
                delay(if (_isRaceStarted.value) 1000 else 5000)
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
        // Solo detener el servicio si NO hay una carrera activa
        if (!_isRaceStarted.value) {
            val ctx = getApplication<Application>()
            ctx.stopService(Intent(ctx, WearTrackingService::class.java))
        }
    }
}
