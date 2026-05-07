package com.appradar.di

import android.content.Context
import androidx.room.Room
import com.appradar.data.local.AppDatabase
import com.appradar.data.local.dao.RadarDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext appContext: Context): AppDatabase {
        return Room.databaseBuilder(
            appContext,
            AppDatabase::class.java,
            "radar_database"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    @Singleton
    fun provideRadarDao(appDatabase: AppDatabase): RadarDao {
        return appDatabase.radarDao()
    }

    @Provides
    @Singleton
    fun provideUserPreferences(@ApplicationContext context: Context): com.appradar.util.UserPreferences {
        return com.appradar.util.UserPreferences(context)
    }
}
