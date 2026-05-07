package com.appradar.data.repository

import com.appradar.data.local.dao.RadarDao
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RadarRepository @Inject constructor(
    private val radarDao: RadarDao,
    private val apiService: com.appradar.data.remote.RadarApiService
) {
    suspend fun login(user: String, passw: String): Boolean {
        return try {
            val response = apiService.login(mapOf("user" to user, "passw" to passw))
            if (response.isSuccessful && response.body() != null) {
                saveUser(response.body()!!)
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    suspend fun syncTrailsFromApi() {
        try {
            val response = apiService.getTrails()
            if (response.isSuccessful && response.body() != null) {
                saveTrails(response.body()!!)
            }
        } catch (e: Exception) {}
    }

    suspend fun downloadTrailDetails(trailUuid: String) {
        try {
            val response = apiService.getTrailDetails(trailUuid)
            if (response.isSuccessful && response.body() != null) {
                val details = response.body()!!
                saveTrail(details.trail)
                saveWaypoints(details.waypoints)
            }
        } catch (e: Exception) {}
    }

    suspend fun uploadUnsyncedTracks() {
        try {
            val unsynced = radarDao.getUnsyncedTracks()
            if (unsynced.isNotEmpty()) {
                val response = apiService.uploadTracks(unsynced)
                if (response.isSuccessful) {
                    radarDao.markTracksAsSynced(unsynced.map { it.trackUuid })
                }
            }
        } catch (e: Exception) {}
    }

    suspend fun uploadRaceRun(run: RaceRunEntity) {
        try {
            apiService.uploadRaceRun(run)
        } catch (e: Exception) {}
    }

    suspend fun getRankings(trailUuid: String, teamUuid: String): List<com.appradar.data.remote.RankingEntry> {
        return try {
            val response = apiService.getRankings(trailUuid, teamUuid)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
    suspend fun saveUser(user: UserEntity) {
        radarDao.insertUser(user)
    }

    suspend fun getCurrentUser(): UserEntity? {
        return radarDao.getCurrentUser()
    }

    suspend fun saveTrail(trail: TrailEntity) {
        radarDao.insertTrail(trail)
    }

    suspend fun saveTrails(trails: List<TrailEntity>) {
        radarDao.insertTrails(trails)
    }

    suspend fun saveWaypoints(waypoints: List<WaypointEntity>) {
        radarDao.insertWaypoints(waypoints)
    }

    suspend fun savePathPoints(pathPoints: List<PathPointEntity>) {
        radarDao.insertPathPoints(pathPoints)
    }

    suspend fun saveTrack(track: TrackEntity) {
        radarDao.insertTrack(track)
    }

    suspend fun saveRaceRun(run: RaceRunEntity) {
        radarDao.insertRaceRun(run)
    }

    fun getAllRaceRuns(): Flow<List<RaceRunEntity>> {
        return radarDao.getAllRaceRuns()
    }

    fun getTracksForRun(runUuid: String): Flow<List<TrackEntity>> {
        return radarDao.getTracksForRun(runUuid)
    }

    suspend fun deleteRaceRun(runUuid: String) {
        radarDao.deleteRaceRun(runUuid)
        radarDao.deleteTracksForRun(runUuid)
    }

    fun getAllTrails(): Flow<List<TrailEntity>> {
        return radarDao.getAllTrails()
    }

    suspend fun getTrailById(trailUuid: String): TrailEntity? {
        return radarDao.getTrailById(trailUuid)
    }

    fun getPathPointsForTrail(trailUuid: String): Flow<List<PathPointEntity>> {
        return radarDao.getPathPointsForTrail(trailUuid)
    }

    fun getWaypointsForTrail(trailUuid: String): Flow<List<WaypointEntity>> {
        return radarDao.getWaypointsForTrail(trailUuid)
    }

    suspend fun getWaypointsForTrailList(trailUuid: String): List<WaypointEntity> {
        return radarDao.getWaypointsForTrailList(trailUuid)
    }

    suspend fun getUnsyncedTracks(): List<TrackEntity> {
        return radarDao.getUnsyncedTracks()
    }

    suspend fun markTracksAsSynced(trackUuids: List<String>) {
        radarDao.markTracksAsSynced(trackUuids)
    }
}
