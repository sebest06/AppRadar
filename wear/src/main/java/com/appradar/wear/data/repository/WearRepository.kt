package com.appradar.wear.data.repository

import com.appradar.wear.data.local.WearDao
import com.appradar.wear.data.local.entity.WearTrackEntity
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity
import com.appradar.wear.data.remote.WearApiService
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WearRepository @Inject constructor(
    private val wearDao: WearDao,
    private val apiService: WearApiService
) {
    fun getAllTrails(): Flow<List<WearTrailEntity>> = wearDao.getAllTrails()

    suspend fun getTrailById(trailUuid: String): WearTrailEntity? =
        wearDao.getTrailById(trailUuid)

    fun getWaypointsForTrail(trailUuid: String): Flow<List<WearWaypointEntity>> =
        wearDao.getWaypointsForTrail(trailUuid)

    suspend fun syncTrailsFromApi() {
        val response = apiService.getTrails()
        if (response.isSuccessful) {
            val trails = response.body() ?: return
            wearDao.insertTrails(trails)
            trails.forEach { trail ->
                val details = apiService.getTrailDetails(trail.trailUuid)
                if (details.isSuccessful) {
                    details.body()?.waypoints?.let { wearDao.insertWaypoints(it) }
                }
            }
        }
    }

    suspend fun saveTrailsFromPhone(trails: List<WearTrailEntity>, waypoints: List<WearWaypointEntity>) {
        wearDao.insertTrails(trails)
        wearDao.insertWaypoints(waypoints)
    }

    suspend fun saveTrack(track: WearTrackEntity) = wearDao.insertTrack(track)

    suspend fun uploadUnsyncedTracks() {
        val unsynced = wearDao.getUnsyncedTracks()
        if (unsynced.isNotEmpty()) {
            val response = apiService.uploadTracks(unsynced)
            if (response.isSuccessful) {
                wearDao.markTracksAsSynced(unsynced.map { it.trackUuid })
            }
        }
    }
}
