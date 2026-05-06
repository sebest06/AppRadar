package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "waypoints")
data class WaypointEntity(
    @PrimaryKey val waypointUuid: String,
    val trailUuid: String,
    val latitude: Double,
    val longitude: Double
)
