package com.appradar.wear.data.repository

import com.appradar.wear.data.local.WearDao
import com.appradar.wear.data.local.entity.WearTrackEntity
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity
import com.appradar.wear.data.remote.WearApiService
import com.appradar.wear.util.WearUserPreferences
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WearRepository @Inject constructor(
    private val wearDao: WearDao,
    private val apiService: WearApiService,
    private val userPreferences: WearUserPreferences
) {
    fun getAllTrails(): Flow<List<WearTrailEntity>> = wearDao.getAllTrails()

    suspend fun getTrailById(trailUuid: String): WearTrailEntity? =
        wearDao.getTrailById(trailUuid)

    suspend fun getLastRunForTrail(trailUuid: String): com.appradar.wear.data.local.entity.WearRaceRunEntity? =
        wearDao.getLastRunForTrail(trailUuid)

    fun getWaypointsForTrail(trailUuid: String): Flow<List<WearWaypointEntity>> =
        wearDao.getWaypointsForTrail(trailUuid)

    fun getTracksForRun(runUuid: String): Flow<List<WearTrackEntity>> =
        wearDao.getTracksForRun(runUuid)

    suspend fun login(user: String, passw: String): Boolean {
        return try {
            val response = apiService.login(mapOf("user" to user, "passw" to passw))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                userPreferences.setAuthToken(loginResponse.token)
                userPreferences.setUserUuid(loginResponse.user.uuid)
                userPreferences.setUserName(loginResponse.user.nombre)
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    suspend fun syncTrailsFromApi() {
        try {
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
        } catch (_: Exception) {}
    }

    suspend fun saveTrailsFromPhone(trails: List<WearTrailEntity>, waypoints: List<WearWaypointEntity>) {
        wearDao.insertTrails(trails)
        wearDao.insertWaypoints(waypoints)
    }

    suspend fun saveTrack(track: WearTrackEntity) {
        wearDao.insertTrack(track)
        uploadUnsyncedData()
    }

    suspend fun saveRaceRun(run: com.appradar.wear.data.local.entity.WearRaceRunEntity): String? {
        wearDao.insertRaceRun(run)
        uploadUnsyncedData()
        return wearDao.getRaceRunById(run.runUuid)?.sessionUuid
    }

    suspend fun uploadUnsyncedData() {
        // 1. Sync Runs
        try {
            val unsyncedRuns = wearDao.getUnsyncedRaceRuns()
            unsyncedRuns.forEach { run ->
                val response = apiService.uploadRaceRun(run)
                if (response.isSuccessful && response.body() != null) {
                    val sessionUuid = response.body()!!.sessionUuid
                    if (sessionUuid != null) {
                        wearDao.markRaceRunAsSynced(run.runUuid, sessionUuid)
                    }
                }
            }
        } catch (_: Exception) {}

        // 2. Sync Tracks
        try {
            val unsynced = wearDao.getUnsyncedTracks()
            if (unsynced.isNotEmpty()) {
                val response = apiService.uploadTracks(unsynced)
                if (response.isSuccessful) {
                    wearDao.markTracksAsSynced(unsynced.map { it.trackUuid })
                }
            }
        } catch (_: Exception) {}
    }

    suspend fun hasUnsyncedData(): Boolean {
        return try {
            wearDao.getUnsyncedRaceRuns().isNotEmpty() || wearDao.getUnsyncedTracks().isNotEmpty()
        } catch (_: Exception) {
            false
        }
    }

    suspend fun getRankings(trailUuid: String, teamUuid: String? = null, sessionUuid: String? = null): List<com.appradar.wear.data.remote.WearRankingEntry> {
        return try {
            val response = apiService.getRankings(trailUuid, teamUuid, sessionUuid)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
