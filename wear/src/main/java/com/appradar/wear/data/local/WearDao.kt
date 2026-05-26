package com.appradar.wear.data.local

import androidx.room.*
import com.appradar.wear.data.local.entity.WearRaceRunEntity
import com.appradar.wear.data.local.entity.WearTrackEntity
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WearDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrails(trails: List<WearTrailEntity>)

    @Query("SELECT * FROM wear_trails ORDER BY name ASC")
    fun getAllTrails(): Flow<List<WearTrailEntity>>

    @Query("SELECT * FROM wear_trails WHERE trailUuid = :trailUuid")
    suspend fun getTrailById(trailUuid: String): WearTrailEntity?

    @Query("SELECT * FROM wear_race_runs WHERE runUuid = :runUuid LIMIT 1")
    suspend fun getRaceRunById(runUuid: String): WearRaceRunEntity?

    @Query("SELECT * FROM wear_race_runs WHERE trailUuid = :trailUuid ORDER BY startTime DESC LIMIT 1")
    suspend fun getLastRunForTrail(trailUuid: String): WearRaceRunEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWaypoints(waypoints: List<WearWaypointEntity>)

    @Query("SELECT * FROM wear_waypoints WHERE trailUuid = :trailUuid ORDER BY `order` ASC")
    fun getWaypointsForTrail(trailUuid: String): Flow<List<WearWaypointEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrack(track: WearTrackEntity)

    @Query("SELECT * FROM wear_tracks WHERE isSynced = 0")
    suspend fun getUnsyncedTracks(): List<WearTrackEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRaceRun(run: WearRaceRunEntity)

    @Query("SELECT * FROM wear_race_runs WHERE isSynced = 0")
    suspend fun getUnsyncedRaceRuns(): List<WearRaceRunEntity>

    @Query("UPDATE wear_race_runs SET isSynced = 1, sessionUuid = :sessionUuid WHERE runUuid = :runUuid")
    suspend fun markRaceRunAsSynced(runUuid: String, sessionUuid: String)

    @Query("UPDATE wear_tracks SET isSynced = 1 WHERE trackUuid IN (:trackUuids)")
    suspend fun markTracksAsSynced(trackUuids: List<String>)

    @Query("SELECT * FROM wear_tracks WHERE runUuid = :runUuid ORDER BY timestamp ASC")
    fun getTracksForRun(runUuid: String): Flow<List<WearTrackEntity>>
}
