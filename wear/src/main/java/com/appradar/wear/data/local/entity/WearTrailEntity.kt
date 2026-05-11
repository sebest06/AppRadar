package com.appradar.wear.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "wear_trails")
data class WearTrailEntity(
    @PrimaryKey val trailUuid: String,
    val name: String,
    val description: String = "",
    val distanceKm: Double = 0.0,
    val elevationM: Double = 0.0,
    val maxSkip: Int = 1,
    val isActive: Boolean = false
)
