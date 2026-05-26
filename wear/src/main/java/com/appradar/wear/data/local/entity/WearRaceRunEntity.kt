package com.appradar.wear.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "wear_race_runs")
data class WearRaceRunEntity(
    @PrimaryKey val runUuid: String,
    val trailUuid: String,
    val userUuid: String = "",
    val trailName: String = "",
    val startTime: Long,
    val endTime: Long? = null,
    val totalTime: Long = 0L,
    val isCompleted: Boolean = false,
    val isAbandoned: Boolean = false,
    val sessionUuid: String? = null,
    val isSynced: Boolean = false
)
