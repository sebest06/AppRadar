package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: RadarRepository,
    private val userPreferences: com.appradar.util.UserPreferences
) : ViewModel() {
    val allTrails: Flow<List<TrailEntity>> = repository.getAllTrails()

    private val _currentUser = MutableStateFlow<UserEntity?>(null)
    val currentUser: StateFlow<UserEntity?> = _currentUser

    val activeTrailUuid: Flow<String?> = userPreferences.activeTrailUuid

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    init {
        viewModelScope.launch {
            _currentUser.value = repository.getCurrentUser()
        }
        refreshTrails()
    }

    fun refreshTrails() {
        viewModelScope.launch {
            _isRefreshing.value = true
            repository.syncTrailsFromApi()
            _isRefreshing.value = false
        }
    }
}
