package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tracks")
data class TrackEntity(
    @PrimaryKey val trackUuid: String,
    val trailUuid: String,
    val runUuid: String, // Unique UUID for each specific start of a race
    val waypointUuid: String,
    val timestamp: Long,
    val timeFromStart: Long = 0L, // Time in millis since race start (excluding pauses)
    val isSynced: Boolean = false
)
