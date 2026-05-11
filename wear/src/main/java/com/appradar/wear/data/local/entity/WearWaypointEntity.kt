package com.appradar.wear.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "wear_waypoints")
data class WearWaypointEntity(
    @PrimaryKey
    @SerializedName("waypointUuid")
    val waypointUuid: String,

    @SerializedName("trailUuid")
    val trailUuid: String,

    @SerializedName("order")
    val order: Int = 0,

    @SerializedName("name")
    val name: String = "",

    @SerializedName("lat")
    val latitude: Double,

    @SerializedName("lon")
    val longitude: Double,

    @SerializedName("radius")
    val radiusInMeters: Float = 50f
)
