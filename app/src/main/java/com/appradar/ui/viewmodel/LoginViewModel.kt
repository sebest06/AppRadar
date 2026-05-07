package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _loginSuccess = MutableStateFlow<Boolean?>(null)
    val loginSuccess: StateFlow<Boolean?> = _loginSuccess

    val apiUrl: StateFlow<String> = repository.apiUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "http://localhost:3000/")

    fun login(url: String, user: String, passw: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.setApiUrl(url)
            val success = repository.login(user, passw)
            _loginSuccess.value = success
            _isLoading.value = false
        }
    }
    
    fun resetLoginStatus() {
        _loginSuccess.value = null
    }
}
