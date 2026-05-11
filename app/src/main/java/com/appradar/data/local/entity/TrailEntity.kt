package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "trails")
data class TrailEntity(
    @PrimaryKey val trailUuid: String,
    val name: String,
    val description: String = "",
    val distanceKm: Double = 0.0,
    val elevationM: Double = 0.0,
    val maxSkip: Int = 1,
    val timestamp: Long = System.currentTimeMillis(),
    val isActive: Boolean = false
)
