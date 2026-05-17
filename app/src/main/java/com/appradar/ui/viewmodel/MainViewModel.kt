package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.util.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    userPreferences: UserPreferences
) : ViewModel() {
    val isLoggedIn: StateFlow<Boolean?> = userPreferences.authToken
        .map { it != null }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
}
