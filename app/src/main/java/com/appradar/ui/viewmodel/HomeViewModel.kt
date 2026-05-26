package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: RadarRepository,
    private val userPreferences: com.appradar.util.UserPreferences
) : ViewModel() {
    val allTrails: Flow<List<TrailEntity>> = repository.getAllTrails()

    val currentUser: StateFlow<UserEntity?> = repository.observeCurrentUser()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val activeTrailUuid: Flow<String?> = userPreferences.activeTrailUuid

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    init {
        refreshTrails()
        syncPendingData()
    }

    fun refreshTrails() {
        viewModelScope.launch {
            _isRefreshing.value = true
            repository.syncTrailsFromApi()
            _isRefreshing.value = false
        }
    }

    private fun syncPendingData() {
        viewModelScope.launch {
            repository.uploadUnsyncedData()
        }
    }
}
