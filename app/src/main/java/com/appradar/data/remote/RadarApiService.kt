package com.appradar.data.remote

import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RadarApiService {

    @POST("auth/login")
    suspend fun login(@Body credentials: Map<String, String>): Response<LoginResponse>

    @GET("trails")
    suspend fun getTrails(): Response<List<TrailEntity>>

    @GET("trails/{trailId}/details")
    suspend fun getTrailDetails(@Path("trailId") trailId: String): Response<TrailDetailsResponse>

    @POST("runs/upload")
    suspend fun uploadRaceRun(@Body run: RaceRunEntity): Response<Unit>

    @POST("tracks/upload")
    suspend fun uploadTracks(@Body tracks: List<TrackEntity>): Response<Unit>

    @GET("rankings")
    suspend fun getRankings(
        @Query("trailUuid") trailUuid: String,
        @Query("teamUuid") teamUuid: String? = null
    ): Response<List<RankingEntry>>

    @POST("gps/upload")
    suspend fun uploadGpsPosition(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<Unit>
}

data class LoginResponse(
    val token: String,
    val user: UserEntity
)

data class TrailDetailsResponse(
    val trailUuid: String,
    val name: String,
    val description: String,
    val distanceKm: Double,
    val elevationM: Double,
    val maxSkip: Int,
    val isActive: Boolean,
    val waypoints: List<WaypointEntity>
)

data class RankingEntry(
    val userUuid: String,
    val userName: String,
    val waypointsReached: Int,
    val totalWaypoints: Int,
    val lastWaypointTime: Long,
    val totalTime: Long,
    val isCompleted: Boolean
)
