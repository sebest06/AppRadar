package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.WaypointEntity
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RunDetails(
    val run: RaceRunEntity,
    val reachedWaypoints: List<Pair<WaypointEntity, TrackEntity>>
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    val raceRuns: Flow<List<RaceRunEntity>> = repository.getAllRaceRuns()

    fun getRunDetails(run: RaceRunEntity): Flow<RunDetails> = flow {
        val waypoints = repository.getWaypointsForTrailList(run.trailUuid)
        repository.getTracksForRun(run.runUuid).collect { tracks ->
            val details = tracks.mapNotNull { track ->
                waypoints.find { it.waypointUuid == track.waypointUuid }?.let { it to track }
            }
            emit(RunDetails(run, details))
        }
    }

    fun deleteRun(runUuid: String) {
        viewModelScope.launch {
            repository.deleteRaceRun(runUuid)
        }
    }
}
