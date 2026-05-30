package com.appradar.ui.viewmodel

import android.content.Context
import android.content.Intent
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
import com.appradar.service.TrackingService
import com.appradar.util.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class ActiveTrailViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repository: RadarRepository,
    private val userPreferences: com.appradar.util.UserPreferences
) : ViewModel() {

    private val _trail = MutableStateFlow<TrailEntity?>(null)
    val trail: StateFlow<TrailEntity?> = _trail

    val currentUser: StateFlow<UserEntity?> = repository.observeCurrentUser()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

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

    private val _isSos = MutableStateFlow(false)
    val isSos: StateFlow<Boolean> = _isSos

    private val _elapsedTimeMillis = MutableStateFlow(0L)
    val elapsedTimeMillis: StateFlow<Long> = _elapsedTimeMillis

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _teammatePositions = MutableStateFlow<List<com.appradar.data.remote.LivePosition>>(emptyList())
    val teammatePositions: StateFlow<List<com.appradar.data.remote.LivePosition>> = _teammatePositions

    private var currentRunUuid: String = ""
    private var initialStartTimeMillis: Long = 0L
    private var lastStartTimeMillis: Long = 0L
    private var accumulatedTimeMillis: Long = 0L
    private var timerJob: Job? = null
    private var teammatePollingJob: Job? = null
    private var currentSessionUuid: String? = null

    companion object {
        private const val TEAMMATE_POLL_MS = 15_000L
    }

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
        
        // Recuperar estado de carrera persistente
        viewModelScope.launch {
            val savedTrailUuid = userPreferences.activeTrailUuid.first()
            if (savedTrailUuid == trailUuid) {
                _isRaceStarted.value = true
                currentRunUuid = userPreferences.activeRunUuid.first() ?: ""
                initialStartTimeMillis = userPreferences.activeStartTime.first()
                currentSessionUuid = userPreferences.activeSessionUuid.first()
                lastStartTimeMillis = initialStartTimeMillis
                accumulatedTimeMillis = 0L

                // Recuperar waypoints ya alcanzados para esta carrera
                repository.getTracksForRun(currentRunUuid).collect { tracks ->
                    _reachedWaypoints.value = tracks.map { it.waypointUuid }.toSet()
                }

                startTimer()
                startTeammatePolling(trailUuid)
            }
        }
    }

    fun startRace() {
        if (_isRaceStarted.value) return

        viewModelScope.launch {
            _error.value = null
            val trailId = _trail.value?.trailUuid ?: return@launch

            // Build the run entity upfront so we can check cooldown with the backend first.
            val newRunUuid = UUID.randomUUID().toString()
            val startTime = System.currentTimeMillis()
            val initialRun = RaceRunEntity(
                runUuid    = newRunUuid,
                trailUuid  = trailId,
                userUuid   = currentUser.value?.uuid ?: "",
                trailName  = _trail.value?.name ?: "Carrera",
                startTime  = startTime,
                isCompleted = false,
                isAbandoned = false,
                sos         = false,
                isSynced    = false
            )

            // Attempt backend registration first.
            // 403 (cooldown) → abort with the server's message.
            // Network error → proceed offline-first (RACE_COOLDOWN_MINUTES is enforced on the server).
            val result = repository.uploadRaceRun(initialRun)
            if (result.errorMessage != null) {
                _error.value = result.errorMessage
                return@launch
            }

            _isRaceStarted.value = true
            _isPaused.value = false
            _reachedWaypoints.value = emptySet()
            _elapsedTimeMillis.value = 0L
            currentRunUuid      = newRunUuid
            initialStartTimeMillis = startTime
            lastStartTimeMillis    = startTime
            accumulatedTimeMillis  = 0L
            currentSessionUuid     = result.sessionUuid

            userPreferences.setActiveRace(trailId, currentRunUuid, initialStartTimeMillis, currentSessionUuid)
            repository.saveRaceRun(
                initialRun.copy(sessionUuid = currentSessionUuid, isSynced = currentSessionUuid != null)
            )

            startTimer()
            startTrackingService()
            startTeammatePolling(trailId)
        }
    }

    private fun startTeammatePolling(trailUuid: String) {
        teammatePollingJob?.cancel()
        teammatePollingJob = viewModelScope.launch {
            while (true) {
                val positions = repository.getLivePositions(trailUuid, currentSessionUuid)
                // Only update if the backend responded successfully (null = network/server error).
                // Keeps last known positions visible instead of erasing them on a transient failure.
                if (positions != null) {
                    val myUuid = currentUser.value?.uuid
                    _teammatePositions.value = positions.filter { it.userUuid != myUuid }
                }
                delay(TEAMMATE_POLL_MS)
            }
        }
    }

    fun stopRace() {
        if (!_isRaceStarted.value) return

        teammatePollingJob?.cancel()
        _teammatePositions.value = emptyList()
        timerJob?.cancel()
        val finalTime = if (_isPaused.value) accumulatedTimeMillis else accumulatedTimeMillis + (System.currentTimeMillis() - lastStartTimeMillis)
        _elapsedTimeMillis.value = finalTime
        _isRaceStarted.value = false
        _isPaused.value = false

        viewModelScope.launch {
            userPreferences.setActiveRace(null, null, 0, null)
        }

        saveRaceRun(isCompleted = false, isAbandoned = true, totalTime = finalTime)
        context.stopService(Intent(context, TrackingService::class.java))
    }

    private fun startTrackingService() {
        val trail = _trail.value ?: return
        val user  = currentUser.value
        val intent = Intent(context, TrackingService::class.java).apply {
            putExtra(TrackingService.EXTRA_TRAIL_UUID, trail.trailUuid)
            putExtra(TrackingService.EXTRA_TEAM_UUID,  user?.uuid_team ?: "")
            putExtra(TrackingService.EXTRA_USER_UUID,  user?.uuid ?: "")
            putExtra(TrackingService.EXTRA_RUN_UUID,   currentRunUuid)
            putExtra(TrackingService.EXTRA_MAX_SKIP,   trail.maxSkip)
            putExtra(TrackingService.EXTRA_START_TIME, initialStartTimeMillis)
        }
        context.startForegroundService(intent)
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

    fun toggleSos() {
        _isSos.value = !_isSos.value
        saveRaceRun(_isRaceStarted.value && reachedWaypoints.value.size == waypoints.value.size)
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                _elapsedTimeMillis.value = accumulatedTimeMillis + (System.currentTimeMillis() - lastStartTimeMillis)
                // Aprovechamos el timer para intentar sincronizar datos pendientes periódicamente
                if (_isSos.value) {
                    saveRaceRun(reachedWaypoints.value.size == waypoints.value.size)
                }
                repository.uploadUnsyncedData()
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
        viewModelScope.launch {
            userPreferences.setActiveRace(null, null, 0, null)
        }
        saveRaceRun(isCompleted = true, totalTime = finalTime)
        context.stopService(Intent(context, TrackingService::class.java))
    }

    private fun saveRaceRun(isCompleted: Boolean, isAbandoned: Boolean = false, totalTime: Long = 0L) {
        viewModelScope.launch {
            val run = RaceRunEntity(
                runUuid     = currentRunUuid,
                trailUuid   = _trail.value?.trailUuid ?: "",
                userUuid    = currentUser.value?.uuid ?: "",
                trailName   = _trail.value?.name ?: "Carrera",
                startTime   = initialStartTimeMillis,
                endTime     = if (isCompleted || isAbandoned) System.currentTimeMillis() else null,
                totalTime   = totalTime,
                isCompleted = isCompleted,
                isAbandoned = isAbandoned,
                sos         = _isSos.value,
                sessionUuid = currentSessionUuid,
                isSynced    = false
            )
            repository.saveRaceRun(run)

            if (isCompleted || isAbandoned || _isSos.value) {
                repository.uploadUnsyncedData()
            } else if (currentSessionUuid == null) {
                // Offline retry: try to get sessionUuid from backend.
                // Only update if successful; ignore cooldown/errors (race already started).
                val result = repository.uploadRaceRun(run)
                if (result.sessionUuid != null) {
                    currentSessionUuid = result.sessionUuid
                    repository.saveRaceRun(run.copy(sessionUuid = result.sessionUuid, isSynced = true))
                    userPreferences.setActiveRace(_trail.value?.trailUuid, currentRunUuid, initialStartTimeMillis, result.sessionUuid)
                }
            }
        }
    }

    private fun saveWaypointReached(waypointUuid: String, timeFromStart: Long) {
        viewModelScope.launch {
            val track = TrackEntity(
                trackUuid = UUID.randomUUID().toString(),
                trailUuid = _trail.value?.trailUuid ?: "",
                runUuid = currentRunUuid,
                userUuid = currentUser.value?.uuid ?: "",
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
        teammatePollingJob?.cancel()
    }
}
