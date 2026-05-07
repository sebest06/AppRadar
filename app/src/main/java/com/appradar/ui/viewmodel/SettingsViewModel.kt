package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.util.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferences: UserPreferences
) : ViewModel() {

    val userIconResId: StateFlow<Int> = userPreferences.userIconResId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.appradar.R.drawable.ic_user_runner)

    fun setUserIcon(iconName: String) {
        viewModelScope.launch {
            userPreferences.setUserIcon(iconName)
        }
    }
}
