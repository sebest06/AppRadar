package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "race_runs")
data class RaceRunEntity(
    @PrimaryKey val runUuid: String,
    val trailUuid: String,
    val userUuid: String = "",
    val trailName: String,
    val startTime: Long,
    val endTime: Long? = null,
    val totalTime: Long = 0L,
    val isCompleted: Boolean = false,
    val sessionUuid: String? = null
)
