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

    @POST("runs/upload")
    suspend fun uploadRaceRun(@Body run: com.appradar.wear.data.local.entity.WearRaceRunEntity): Response<WearUploadRunResponse>

    @GET("rankings")
    suspend fun getRankings(
        @Query("trailUuid") trailUuid: String,
        @Query("teamUuid") teamUuid: String? = null,
        @Query("sessionUuid") sessionUuid: String? = null
    ): Response<List<WearRankingEntry>>
}

data class WearLoginResponse(
    val token: String,
    val user: WearUserDto
)

data class WearUserDto(
    val uuid: String,
    val nombre: String
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

data class WearUploadRunResponse(
    val ok: Boolean,
    val sessionUuid: String? = null
)

data class WearRankingEntry(
    val userUuid: String,
    val userName: String,
    val waypointsReached: Int,
    val totalWaypoints: Int,
    val lastWaypointTime: Long,
    val totalTime: Long,
    val isCompleted: Boolean,
    val isAbandoned: Boolean
)
