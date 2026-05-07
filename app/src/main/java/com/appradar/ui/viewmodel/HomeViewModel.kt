package com.appradar.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.repository.RadarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: RadarRepository
) : ViewModel() {
    val allTrails: Flow<List<TrailEntity>> = repository.getAllTrails()
}
