package com.appradar.data.repository

import com.appradar.data.local.dao.RadarDao
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

    suspend fun saveTrails(trails: List<TrailEntity>) {
        radarDao.insertTrails(trails)
    }

    suspend fun saveWaypoints(waypoints: List<WaypointEntity>) {
        radarDao.insertWaypoints(waypoints)
    }

    suspend fun saveTrack(track: TrackEntity) {
        radarDao.insertTrack(track)
    }

    fun getWaypointsForTrail(trailUuid: String): Flow<List<WaypointEntity>> {
        return radarDao.getWaypointsForTrail(trailUuid)
    }

    suspend fun getUnsyncedTracks(): List<TrackEntity> {
        return radarDao.getUnsyncedTracks()
    }

    suspend fun markTracksAsSynced(trackUuids: List<String>) {
        radarDao.markTracksAsSynced(trackUuids)
    }
}
