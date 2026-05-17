package com.appradar.wear.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.repository.WearRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TrailListViewModel @Inject constructor(
    private val repository: WearRepository,
    private val userPreferences: com.appradar.wear.util.WearUserPreferences
) : ViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    val activeTrailUuid: StateFlow<String?> = userPreferences.activeTrailUuid
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val userName: StateFlow<String?> = userPreferences.userName
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val trails: StateFlow<List<WearTrailEntity>> = repository.getAllTrails()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        syncFromApi()
    }

    fun syncFromApi() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                repository.syncTrailsFromApi()
            } catch (e: Exception) {
                _error.value = "Sin conexión. Mostrando datos locales."
            } finally {
                _isLoading.value = false
            }
        }
    }
}
