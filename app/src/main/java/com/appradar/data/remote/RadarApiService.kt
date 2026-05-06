package com.appradar.data.remote

import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.WaypointEntity
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface RadarApiService {

    @GET("trails")
    suspend fun getTrails(): Response<List<TrailEntity>>

    @GET("trails/{trailId}/waypoints")
    suspend fun getWaypoints(@Path("trailId") trailId: String): Response<List<WaypointEntity>>

    @POST("tracks/sync")
    suspend fun syncTracks(@Body tracks: List<TrackEntity>): Response<Unit>
    
    // Aquí podemos añadir el endpoint para obtener posiciones/leaderboard
}
