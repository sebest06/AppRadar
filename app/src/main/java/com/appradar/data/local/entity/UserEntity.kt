package com.appradar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val uuid: String,
    val user: String,
    val passw: String,
    val nombre: String,
    val team: String,
    val uuid_team: String
)
