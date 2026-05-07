package com.appradar.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.RaceRunEntity
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
    suspend fun insertTrail(trail: TrailEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWaypoints(waypoints: List<WaypointEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPathPoints(pathPoints: List<PathPointEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrack(track: TrackEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRaceRun(run: RaceRunEntity)

    @Query("SELECT * FROM race_runs ORDER BY startTime DESC")
    fun getAllRaceRuns(): Flow<List<RaceRunEntity>>

    @Query("SELECT * FROM tracks WHERE runUuid = :runUuid ORDER BY timestamp ASC")
    fun getTracksForRun(runUuid: String): Flow<List<TrackEntity>>

    @Query("SELECT * FROM waypoints WHERE trailUuid = :trailUuid")
    suspend fun getWaypointsForTrailList(trailUuid: String): List<WaypointEntity>

    @Query("DELETE FROM race_runs WHERE runUuid = :runUuid")
    suspend fun deleteRaceRun(runUuid: String)

    @Query("DELETE FROM tracks WHERE runUuid = :runUuid")
    suspend fun deleteTracksForRun(runUuid: String)

    @Query("SELECT * FROM trails")
    fun getAllTrails(): Flow<List<TrailEntity>>

    @Query("SELECT * FROM trails WHERE trailUuid = :trailUuid")
    suspend fun getTrailById(trailUuid: String): TrailEntity?

    @Query("SELECT * FROM path_points WHERE trailUuid = :trailUuid ORDER BY `order` ASC")
    fun getPathPointsForTrail(trailUuid: String): Flow<List<PathPointEntity>>

    @Query("SELECT * FROM waypoints WHERE trailUuid = :trailUuid")
    fun getWaypointsForTrail(trailUuid: String): Flow<List<WaypointEntity>>

    @Query("SELECT * FROM tracks WHERE isSynced = 0")
    suspend fun getUnsyncedTracks(): List<TrackEntity>

    @Query("UPDATE tracks SET isSynced = 1 WHERE trackUuid IN (:trackUuids)")
    suspend fun markTracksAsSynced(trackUuids: List<String>)
}
