package com.appradar.wear.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "wear_tracks")
data class WearTrackEntity(
    @PrimaryKey val trackUuid: String,
    val trailUuid: String,
    val runUuid: String,
    val userUuid: String = "",
    val waypointUuid: String,
    val timestamp: Long,
    val timeFromStart: Long = 0L,
    val isSynced: Boolean = false
)
