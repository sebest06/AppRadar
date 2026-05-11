package com.appradar.service

import android.content.Context
import com.appradar.data.repository.RadarRepository
import com.appradar.util.UserPreferences
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WearSyncHelper @Inject constructor(
    @ApplicationContext val context: Context,
    val repository: RadarRepository,
    val userPreferences: UserPreferences
) {
    private val gson = Gson()

    suspend fun syncToWatch() {
        pushApiConfig()
        pushTrails()
    }

    private suspend fun pushApiConfig() {
        val apiUrl = userPreferences.apiUrl.first()
        val token = userPreferences.authToken.first()
        val user = repository.getCurrentUser()

        val request = PutDataMapRequest.create("/appradar/api-config").apply {
            dataMap.putString("api_url", apiUrl)
            token?.let { dataMap.putString("auth_token", it) }
            user?.uuid?.let { dataMap.putString("user_uuid", it) }
            setUrgent()
        }.asPutDataRequest()

        Wearable.getDataClient(context).putDataItem(request).await()
    }

    private suspend fun pushTrails() {
        val trails = repository.getAllTrails().first()
        if (trails.isEmpty()) return

        val waypoints = trails.flatMap { repository.getWaypointsForTrailList(it.trailUuid) }

        val request = PutDataMapRequest.create("/appradar/trails").apply {
            dataMap.putString("trails_json", gson.toJson(trails))
            dataMap.putString("waypoints_json", gson.toJson(waypoints))
            setUrgent()
        }.asPutDataRequest()

        Wearable.getDataClient(context).putDataItem(request).await()
    }
}
