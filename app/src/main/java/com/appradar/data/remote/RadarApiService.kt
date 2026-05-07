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
    suspend fun login(@Body credentials: Map<String, String>): Response<UserEntity>

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
        @Query("teamUuid") teamUuid: String
    ): Response<List<RankingEntry>>
}

data class TrailDetailsResponse(
    val trail: TrailEntity,
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
