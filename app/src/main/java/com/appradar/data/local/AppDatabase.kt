package com.appradar.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.appradar.data.local.dao.RadarDao
import com.appradar.data.local.entity.PathPointEntity
import com.appradar.data.local.entity.RaceRunEntity
import com.appradar.data.local.entity.TrackEntity
import com.appradar.data.local.entity.TrailEntity
import com.appradar.data.local.entity.UserEntity
import com.appradar.data.local.entity.WaypointEntity

@Database(
    entities = [
        UserEntity::class,
        TrailEntity::class,
        WaypointEntity::class,
        TrackEntity::class,
        PathPointEntity::class,
        RaceRunEntity::class
    ],
    version = 9,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun radarDao(): RadarDao
}
