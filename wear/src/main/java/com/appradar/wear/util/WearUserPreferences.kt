package com.appradar.wear.util

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.wearDataStore by preferencesDataStore(name = "wear_settings")

class WearUserPreferences(private val context: Context) {

    companion object {
        val API_URL_KEY = stringPreferencesKey("api_url")
        val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        val USER_UUID_KEY = stringPreferencesKey("user_uuid")
        val USER_NAME_KEY = stringPreferencesKey("user_name")
        val ACTIVE_TRAIL_UUID_KEY = stringPreferencesKey("active_trail_uuid")
        val ACTIVE_RUN_UUID_KEY = stringPreferencesKey("active_run_uuid")
        val ACTIVE_START_TIME_KEY = androidx.datastore.preferences.core.longPreferencesKey("active_start_time")
    }

    val apiUrl: Flow<String> = context.wearDataStore.data.map { prefs ->
        prefs[API_URL_KEY] ?: "http://localhost:3000/"
    }

    suspend fun setApiUrl(url: String) {
        context.wearDataStore.edit { it[API_URL_KEY] = url }
    }

    val authToken: Flow<String?> = context.wearDataStore.data.map { it[AUTH_TOKEN_KEY] }

    suspend fun setAuthToken(token: String) {
        context.wearDataStore.edit { it[AUTH_TOKEN_KEY] = token }
    }

    val userUuid: Flow<String?> = context.wearDataStore.data.map { it[USER_UUID_KEY] }

    suspend fun setUserUuid(uuid: String) {
        context.wearDataStore.edit { it[USER_UUID_KEY] = uuid }
    }

    val userName: Flow<String?> = context.wearDataStore.data.map { it[USER_NAME_KEY] }

    suspend fun setUserName(name: String) {
        context.wearDataStore.edit { it[USER_NAME_KEY] = name }
    }

    val activeTrailUuid: Flow<String?> = context.wearDataStore.data.map { it[ACTIVE_TRAIL_UUID_KEY] }
    val activeRunUuid: Flow<String?> = context.wearDataStore.data.map { it[ACTIVE_RUN_UUID_KEY] }
    val activeStartTime: Flow<Long> = context.wearDataStore.data.map { it[ACTIVE_START_TIME_KEY] ?: 0L }

    suspend fun setActiveRace(trailUuid: String?, runUuid: String?, startTime: Long) {
        context.wearDataStore.edit { prefs ->
            if (trailUuid == null) {
                prefs.remove(ACTIVE_TRAIL_UUID_KEY)
                prefs.remove(ACTIVE_RUN_UUID_KEY)
                prefs.remove(ACTIVE_START_TIME_KEY)
            } else {
                prefs[ACTIVE_TRAIL_UUID_KEY] = trailUuid
                if (runUuid != null) prefs[ACTIVE_RUN_UUID_KEY] = runUuid
                prefs[ACTIVE_START_TIME_KEY] = startTime
            }
        }
    }
}
