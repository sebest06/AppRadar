package com.appradar.wear.data.remote

import com.appradar.wear.data.local.entity.WearTrackEntity
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity
import retrofit2.Response
import retrofit2.http.*

interface WearApiService {

    @POST("auth/login")
    suspend fun login(@Body credentials: Map<String, String>): Response<WearLoginResponse>

    @GET("trails")
    suspend fun getTrails(): Response<List<WearTrailEntity>>

    @GET("trails/{trailId}/details")
    suspend fun getTrailDetails(@Path("trailId") trailId: String): Response<WearTrailDetailsResponse>

    @POST("tracks/upload")
    suspend fun uploadTracks(@Body tracks: List<WearTrackEntity>): Response<Unit>
}

data class WearLoginResponse(
    val token: String,
    val userUuid: String = ""
)

data class WearTrailDetailsResponse(
    val trailUuid: String,
    val name: String,
    val description: String = "",
    val distanceKm: Double = 0.0,
    val elevationM: Double = 0.0,
    val maxSkip: Int = 1,
    val isActive: Boolean = false,
    val waypoints: List<WearWaypointEntity>
)
