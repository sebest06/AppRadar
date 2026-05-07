package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "path_points")
data class PathPointEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val trailUuid: String,
    val latitude: Double,
    val longitude: Double,
    val order: Int
)
