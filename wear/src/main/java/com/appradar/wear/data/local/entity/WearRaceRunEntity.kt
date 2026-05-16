package com.appradar.wear.data.local.entity

data class WearRaceRunEntity(
    val runUuid: String,
    val trailUuid: String,
    val userUuid: String = "",
    val trailName: String = "",
    val startTime: Long,
    val endTime: Long? = null,
    val totalTime: Long = 0L,
    val isCompleted: Boolean = false,
    val sessionUuid: String? = null
)
