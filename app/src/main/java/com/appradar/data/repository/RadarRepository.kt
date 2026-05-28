package com.appradar.data.repository

import com.appradar.data.local.dao.RadarDao
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RadarRepository @Inject constructor(
    private val radarDao: RadarDao,
    private val apiService: com.appradar.data.remote.RadarApiService,
    private val userPreferences: com.appradar.util.UserPreferences
) {
    val apiUrl: kotlinx.coroutines.flow.Flow<String> = userPreferences.apiUrl

    suspend fun setApiUrl(url: String) {
        userPreferences.setApiUrl(url)
    }

    suspend fun login(user: String, passw: String): Boolean {
        return try {
            val response = apiService.login(mapOf("user" to user, "passw" to passw))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                userPreferences.setAuthToken(loginResponse.token)
                userPreferences.setUserUuid(loginResponse.user.uuid)
                saveUser(loginResponse.user)
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
                val trails = response.body()!!
                saveTrails(trails)
                // Para cada carrera, descargar detalles (waypoints)
                trails.forEach { trail ->
                    downloadTrailDetails(trail.trailUuid)
                }
            }
        } catch (e: Exception) {}
    }

    suspend fun downloadTrailDetails(trailUuid: String) {
        try {
            val response = apiService.getTrailDetails(trailUuid)
            if (response.isSuccessful && response.body() != null) {
                val details = response.body()!!
                val trail = TrailEntity(
                    trailUuid = details.trailUuid,
                    name = details.name,
                    description = details.description,
                    distanceKm = details.distanceKm,
                    elevationM = details.elevationM,
                    maxSkip = details.maxSkip,
                    timestamp = System.currentTimeMillis(),
                    isActive = details.isActive
                )
                saveTrail(trail)
                saveWaypoints(details.waypoints)
            }
        } catch (e: Exception) {}
    }

    suspend fun uploadUnsyncedData() {
        // 1. Sincronizar Carreras (Runs) que no tienen sessionUuid o han cambiado
        try {
            val unsyncedRuns = radarDao.getUnsyncedRaceRuns()
            unsyncedRuns.forEach { run ->
                val response = apiService.uploadRaceRun(run)
                if (response.isSuccessful && response.body() != null) {
                    val sessionUuid = response.body()!!.sessionUuid
                    if (sessionUuid != null) {
                        radarDao.markRaceRunAsSynced(run.runUuid, sessionUuid)
                    }
                }
            }
        } catch (_: Exception) {}

        // 2. Sincronizar Waypoints (Tracks)
        try {
            val unsynced = radarDao.getUnsyncedTracks()
            if (unsynced.isNotEmpty()) {
                val response = apiService.uploadTracks(unsynced)
                if (response.isSuccessful) {
                    radarDao.markTracksAsSynced(unsynced.map { it.trackUuid })
                }
            }
        } catch (_: Exception) {}
    }

    suspend fun uploadRaceRun(run: RaceRunEntity): String? {
        try {
            val response = apiService.uploadRaceRun(run)
            if (response.isSuccessful) {
                return response.body()?.sessionUuid
            }
        } catch (e: Exception) {}
        return null
    }

    suspend fun uploadGpsPosition(trailUuid: String, lat: Double, lon: Double, accuracy: Float) {
        try {
            val userIcon = userPreferences.userIconName.firstOrNull() ?: "runner"
            apiService.uploadGpsPosition(mapOf(
                "trailUuid" to trailUuid,
                "lat" to lat,
                "lon" to lon,
                "accuracy" to accuracy,
                "activityType" to userIcon,
                "timestamp" to System.currentTimeMillis()
            ))
        } catch (_: Exception) {}
    }

    suspend fun getLivePositions(trailUuid: String, sessionUuid: String? = null): List<com.appradar.data.remote.LivePosition> {
        return try {
            val response = apiService.getLivePositions(trailUuid, sessionUuid)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getRankings(trailUuid: String, teamUuid: String? = null, sessionUuid: String? = null): List<com.appradar.data.remote.RankingEntry> {
        return try {
            val response = apiService.getRankings(trailUuid, teamUuid, sessionUuid)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    fun observeCurrentUser(): Flow<UserEntity?> {
        return userPreferences.userUuid.flatMapLatest { uuid ->
            if (uuid != null) radarDao.getUserByIdFlow(uuid)
            else flowOf(null)
        }
    }

    suspend fun saveUser(user: UserEntity) {
        radarDao.insertUser(user)
    }

    suspend fun getCurrentUser(): UserEntity? {
        val uuid = userPreferences.userUuid.firstOrNull() ?: return radarDao.getCurrentUser()
        return radarDao.getUserById(uuid)
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
        uploadUnsyncedData()
    }

    suspend fun saveRaceRun(run: RaceRunEntity) {
        radarDao.insertRaceRun(run)
        uploadUnsyncedData()
    }

    fun getAllRaceRuns(): Flow<List<RaceRunEntity>> {
        return radarDao.getAllRaceRuns()
    }

    suspend fun getRaceRunById(runUuid: String): RaceRunEntity? {
        return radarDao.getRaceRunById(runUuid)
    }

    suspend fun getLastRunForTrail(trailUuid: String): RaceRunEntity? {
        return radarDao.getLastRunForTrail(trailUuid)
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
