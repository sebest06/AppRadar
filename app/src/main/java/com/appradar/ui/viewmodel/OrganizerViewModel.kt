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
class OrganizerViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    private val _rankings = MutableStateFlow<List<RankingEntry>>(emptyList())
    val rankings: StateFlow<List<RankingEntry>> = _rankings

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _messageSent = MutableStateFlow<Boolean?>(null)
    val messageSent: StateFlow<Boolean?> = _messageSent

    fun refreshRankings(trailUuid: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _rankings.value = repository.getRankings(trailUuid)
            _isLoading.value = false
        }
    }

    fun sendMessage(trailUuid: String, recipientUuid: String?, content: String) {
        viewModelScope.launch {
            val ok = repository.sendMessage(trailUuid, recipientUuid, content)
            _messageSent.value = ok
        }
    }

    fun clearMessageSentState() {
        _messageSent.value = null
    }
}
