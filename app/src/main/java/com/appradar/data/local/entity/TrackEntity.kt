package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tracks")
data class TrackEntity(
    @PrimaryKey val trackUuid: String,
    val trailUuid: String,
    val waypointUuid: String,
    val timestamp: Long,
    val isSynced: Boolean = false
)
