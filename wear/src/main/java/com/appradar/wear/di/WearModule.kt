package com.appradar.wear.di

import android.content.Context
import androidx.room.Room
import com.appradar.wear.data.local.WearDao
import com.appradar.wear.data.local.WearDatabase
import com.appradar.wear.data.remote.WearApiService
import com.appradar.wear.data.remote.WearDynamicUrlInterceptor
import com.appradar.wear.util.WearUserPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object WearModule {

    @Provides
    @Singleton
    fun provideWearDatabase(@ApplicationContext context: Context): WearDatabase =
        Room.databaseBuilder(context, WearDatabase::class.java, "wear_database")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    @Singleton
    fun provideWearDao(db: WearDatabase): WearDao = db.wearDao()

    @Provides
    @Singleton
    fun provideWearUserPreferences(@ApplicationContext context: Context) =
        WearUserPreferences(context)

    @Provides
    @Singleton
    fun provideOkHttpClient(interceptor: WearDynamicUrlInterceptor): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl("http://localhost/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideWearApiService(retrofit: Retrofit): WearApiService =
        retrofit.create(WearApiService::class.java)
}
