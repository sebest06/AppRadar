package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.remote.RankingEntry
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LeaderboardViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    private val _rankings = MutableStateFlow<List<RankingEntry>>(emptyList())
    val rankings: StateFlow<List<RankingEntry>> = _rankings

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun refreshRankings(trailUuid: String, teamUuid: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _rankings.value = repository.getRankings(trailUuid, teamUuid)
            _isLoading.value = false
        }
    }
}
