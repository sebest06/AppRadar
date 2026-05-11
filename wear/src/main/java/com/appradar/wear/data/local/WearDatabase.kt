package com.appradar.wear.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.appradar.wear.data.local.entity.WearTrackEntity
import com.appradar.wear.data.local.entity.WearTrailEntity
import com.appradar.wear.data.local.entity.WearWaypointEntity

@Database(
    entities = [WearTrailEntity::class, WearWaypointEntity::class, WearTrackEntity::class],
    version = 1,
    exportSchema = false
)
abstract class WearDatabase : RoomDatabase() {
    abstract fun wearDao(): WearDao
}
