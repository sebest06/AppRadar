package com.appradar.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RadarDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrails(trails: List<TrailEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWaypoints(waypoints: List<WaypointEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrack(track: TrackEntity)

    @Query("SELECT * FROM waypoints WHERE trailUuid = :trailUuid")
    fun getWaypointsForTrail(trailUuid: String): Flow<List<WaypointEntity>>

    @Query("SELECT * FROM tracks WHERE isSynced = 0")
    suspend fun getUnsyncedTracks(): List<TrackEntity>

    @Query("UPDATE tracks SET isSynced = 1 WHERE trackUuid IN (:trackUuids)")
    suspend fun markTracksAsSynced(trackUuids: List<String>)
}
