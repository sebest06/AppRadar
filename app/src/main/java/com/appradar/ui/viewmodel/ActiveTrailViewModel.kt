package com.appradar.ui.viewmodel

import android.location.Location
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.repository.RadarRepository
import com.appradar.util.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class ActiveTrailViewModel @Inject constructor(
    private val repository: RadarRepository,
    private val userPreferences: com.appradar.util.UserPreferences
) : ViewModel() {

    private val _trail = MutableStateFlow<TrailEntity?>(null)
    val trail: StateFlow<TrailEntity?> = _trail

    private val _currentUser = MutableStateFlow<UserEntity?>(null)
    val currentUser: StateFlow<UserEntity?> = _currentUser

    val userIconResId: StateFlow<Int> = userPreferences.userIconResId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.appradar.R.drawable.ic_user_runner)

    private val _waypoints = MutableStateFlow<List<WaypointEntity>>(emptyList())
    val waypoints: StateFlow<List<WaypointEntity>> = _waypoints

    private val _pathPoints = MutableStateFlow<List<PathPointEntity>>(emptyList())
    val pathPoints: StateFlow<List<PathPointEntity>> = _pathPoints

    private val _reachedWaypoints = MutableStateFlow<Set<String>>(emptySet())
    val reachedWaypoints: StateFlow<Set<String>> = _reachedWaypoints

    private val _isRaceStarted = MutableStateFlow(false)
    val isRaceStarted: StateFlow<Boolean> = _isRaceStarted

    private val _isPaused = MutableStateFlow(false)
    val isPaused: StateFlow<Boolean> = _isPaused

    private val _elapsedTimeMillis = MutableStateFlow(0L)
    val elapsedTimeMillis: StateFlow<Long> = _elapsedTimeMillis

    private var currentRunUuid: String = ""
    private var lastStartTimeMillis: Long = 0L
    private var accumulatedTimeMillis: Long = 0L
    private var timerJob: Job? = null

    fun loadTrail(trailUuid: String) {
        viewModelScope.launch {
            _currentUser.value = repository.getCurrentUser()
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

    fun startRace() {
        if (_isRaceStarted.value) return
        _isRaceStarted.value = true
        _isPaused.value = false
        _reachedWaypoints.value = emptySet()
        _elapsedTimeMillis.value = 0L
        currentRunUuid = UUID.randomUUID().toString()
        lastStartTimeMillis = System.currentTimeMillis()
        accumulatedTimeMillis = 0L
        
        saveRaceRun(isCompleted = false)
        startTimer()
    }

    fun stopRace() {
        if (!_isRaceStarted.value) return
        
        timerJob?.cancel()
        val finalTime = if (_isPaused.value) accumulatedTimeMillis else accumulatedTimeMillis + (System.currentTimeMillis() - lastStartTimeMillis)
        _elapsedTimeMillis.value = finalTime
        _isRaceStarted.value = false
        _isPaused.value = false
        
        saveRaceRun(isCompleted = _reachedWaypoints.value.size == _waypoints.value.size, totalTime = finalTime)
    }

    fun togglePause() {
        if (!_isRaceStarted.value) return
        
        if (_isPaused.value) {
            // Resume
            _isPaused.value = false
            lastStartTimeMillis = System.currentTimeMillis()
            startTimer()
        } else {
            // Pause
            _isPaused.value = true
            timerJob?.cancel()
            accumulatedTimeMillis += System.currentTimeMillis() - lastStartTimeMillis
            _elapsedTimeMillis.value = accumulatedTimeMillis
        }
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                _elapsedTimeMillis.value = accumulatedTimeMillis + (System.currentTimeMillis() - lastStartTimeMillis)
                delay(1000)
            }
        }
    }

    fun onLocationUpdate(location: Location) {
        if (!_isRaceStarted.value || _isPaused.value) return

        val currentWaypoints = _waypoints.value
        val reached = _reachedWaypoints.value.toMutableSet()
        val maxSkip = _trail.value?.maxSkip ?: 0

        val startIndex = reached.size
        // Buscamos desde el siguiente waypoint esperado hasta startIndex + maxSkip
        val limitIndex = (startIndex + maxSkip).coerceAtMost(currentWaypoints.size - 1)

        for (i in startIndex..limitIndex) {
            val waypoint = currentWaypoints[i]
            if (LocationHelper.isWithinWaypointRadius(
                    currentLocation = location,
                    waypointLat = waypoint.latitude,
                    waypointLon = waypoint.longitude,
                    radiusInMeters = waypoint.radiusInMeters
                )
            ) {
                // Hemos alcanzado el waypoint i. 
                // Marcamos todos los waypoints desde startIndex hasta i como alcanzados.
                val currentTime = accumulatedTimeMillis + (System.currentTimeMillis() - lastStartTimeMillis)
                
                for (j in startIndex..i) {
                    val wpToMark = currentWaypoints[j]
                    if (!reached.contains(wpToMark.waypointUuid)) {
                        reached.add(wpToMark.waypointUuid)
                        saveWaypointReached(wpToMark.waypointUuid, currentTime)
                    }
                }
                
                _reachedWaypoints.value = reached

                if (reached.size == currentWaypoints.size) {
                    finishRace(currentTime)
                }
                break // Solo procesamos un waypoint por actualización
            }
        }
    }

    private fun finishRace(finalTime: Long) {
        timerJob?.cancel()
        _isRaceStarted.value = false // Could keep it true but set a "finished" state
        saveRaceRun(isCompleted = true, totalTime = finalTime)
    }

    private fun saveRaceRun(isCompleted: Boolean, totalTime: Long = 0L) {
        viewModelScope.launch {
            val run = RaceRunEntity(
                runUuid = currentRunUuid,
                trailUuid = _trail.value?.trailUuid ?: "",
                userUuid = _currentUser.value?.uuid ?: "",
                trailName = _trail.value?.name ?: "Carrera",
                startTime = System.currentTimeMillis(), // Initial start
                endTime = if (isCompleted) System.currentTimeMillis() else null,
                totalTime = totalTime,
                isCompleted = isCompleted
            )
            repository.saveRaceRun(run)
            if (isCompleted) {
                repository.uploadRaceRun(run)
            }
        }
    }

    private fun saveWaypointReached(waypointUuid: String, timeFromStart: Long) {
        viewModelScope.launch {
            val track = TrackEntity(
                trackUuid = UUID.randomUUID().toString(),
                trailUuid = _trail.value?.trailUuid ?: "",
                runUuid = currentRunUuid,
                userUuid = _currentUser.value?.uuid ?: "",
                waypointUuid = waypointUuid,
                timestamp = System.currentTimeMillis(),
                timeFromStart = timeFromStart
            )
            repository.saveTrack(track)
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
