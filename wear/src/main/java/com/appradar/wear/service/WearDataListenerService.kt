package com.appradar.wear.service

import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity
import com.appradar.wear.data.repository.WearRepository
import com.appradar.wear.util.WearUserPreferences
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class WearDataListenerService : WearableListenerService() {

    @Inject
    lateinit var userPreferences: WearUserPreferences

    @Inject
    lateinit var repository: WearRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val gson = Gson()

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED) {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                when (event.dataItem.uri.path) {
                    "/appradar/api-config" -> {
                        val apiUrl = dataMap.getString("api_url") ?: return@forEach
                        val token = dataMap.getString("auth_token")
                        val userUuid = dataMap.getString("user_uuid")
                        serviceScope.launch {
                            userPreferences.setApiUrl(apiUrl)
                            token?.let { userPreferences.setAuthToken(it) }
                            userUuid?.let { userPreferences.setUserUuid(it) }
                        }
                    }
                    "/appradar/trails" -> {
                        val trailsJson = dataMap.getString("trails_json") ?: return@forEach
                        val waypointsJson = dataMap.getString("waypoints_json") ?: return@forEach
                        serviceScope.launch {
                            try {
                                val trailType = object : TypeToken<List<WearTrailEntity>>() {}.type
                                val waypointType = object : TypeToken<List<WearWaypointEntity>>() {}.type
                                val trails: List<WearTrailEntity> = gson.fromJson(trailsJson, trailType)
                                val waypoints: List<WearWaypointEntity> = gson.fromJson(waypointsJson, waypointType)
                                repository.saveTrailsFromPhone(trails, waypoints)
                            } catch (e: Exception) {
                                // Error al parsear datos del teléfono
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
