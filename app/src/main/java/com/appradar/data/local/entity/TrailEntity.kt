package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "trails")
data class TrailEntity(
    @PrimaryKey val trailUuid: String,
    val carreraId: String,
    val name: String,
    val timestamp: Long
)
