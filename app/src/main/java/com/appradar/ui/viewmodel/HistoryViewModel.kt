package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    val raceRuns: Flow<List<RaceRunEntity>> = repository.getAllRaceRuns()

    fun getTracksForRun(runUuid: String): Flow<List<TrackEntity>> {
        return repository.getTracksForRun(runUuid)
    }

    fun deleteRun(runUuid: String) {
        viewModelScope.launch {
            repository.deleteRaceRun(runUuid)
        }
    }
}
