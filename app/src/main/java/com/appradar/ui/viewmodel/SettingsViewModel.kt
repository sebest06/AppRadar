package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.service.WearSyncHelper
import com.appradar.util.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferences: UserPreferences,
    private val wearSyncHelper: WearSyncHelper
) : ViewModel() {

    val userIconResId: StateFlow<Int> = userPreferences.userIconResId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.appradar.R.drawable.ic_user_runner)

    private val _wearSyncState = MutableStateFlow<WearSyncState>(WearSyncState.Idle)
    val wearSyncState: StateFlow<WearSyncState> = _wearSyncState

    fun setUserIcon(iconName: String) {
        viewModelScope.launch {
            userPreferences.setUserIcon(iconName)
        }
    }

    fun syncToWatch() {
        viewModelScope.launch {
            _wearSyncState.value = WearSyncState.Syncing
            try {
                wearSyncHelper.syncToWatch()
                _wearSyncState.value = WearSyncState.Success
            } catch (e: Exception) {
                _wearSyncState.value = WearSyncState.Error("Reloj no disponible")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            userPreferences.setAuthToken(null)
            userPreferences.setUserUuid(null)
        }
    }
}

sealed class WearSyncState {
    object Idle : WearSyncState()
    object Syncing : WearSyncState()
    object Success : WearSyncState()
    data class Error(val message: String) : WearSyncState()
}
