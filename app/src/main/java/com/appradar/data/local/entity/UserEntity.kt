package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val uuid: String,
    val user: String,
    val nombre: String,
    val team: String = "",
    val uuid_team: String = "",
    val role: String = "runner",
    val teamStatus: String = "accepted"
)
