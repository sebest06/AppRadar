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
    private val radarDao: RadarDao
) {
    suspend fun saveUser(user: UserEntity) {
        radarDao.insertUser(user)
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
