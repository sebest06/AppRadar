package com.appradar.util

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.appradar.R
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "settings")

class UserPreferences(private val context: Context) {
    companion object {
        val USER_ICON_KEY = stringPreferencesKey("user_icon")
        val API_URL_KEY = stringPreferencesKey("api_url")
        val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        val USER_UUID_KEY = stringPreferencesKey("user_uuid")
        val ACTIVE_TRAIL_UUID_KEY = stringPreferencesKey("active_trail_uuid")
        val ACTIVE_RUN_UUID_KEY = stringPreferencesKey("active_run_uuid")
        val ACTIVE_START_TIME_KEY = androidx.datastore.preferences.core.longPreferencesKey("active_start_time")
        val ACTIVE_SESSION_UUID_KEY = stringPreferencesKey("active_session_uuid")
    }

    val authToken: Flow<String?> = context.dataStore.data.map { it[AUTH_TOKEN_KEY] }

    suspend fun setAuthToken(token: String?) {
        context.dataStore.edit { preferences ->
            if (token == null) preferences.remove(AUTH_TOKEN_KEY)
            else preferences[AUTH_TOKEN_KEY] = token
        }
    }

    val userUuid: Flow<String?> = context.dataStore.data.map { it[USER_UUID_KEY] }

    suspend fun setUserUuid(uuid: String?) {
        context.dataStore.edit { preferences ->
            if (uuid == null) preferences.remove(USER_UUID_KEY)
            else preferences[USER_UUID_KEY] = uuid
        }
    }

    val apiUrl: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[API_URL_KEY] ?: "http://localhost:3000/"
    }

    suspend fun setApiUrl(url: String) {
        context.dataStore.edit { preferences ->
            preferences[API_URL_KEY] = url
        }
    }

    val userIconResId: Flow<Int> = context.dataStore.data.map { preferences ->
        val iconName = preferences[USER_ICON_KEY] ?: "runner"
        when (iconName) {
            "bike" -> R.drawable.ic_user_bike
            "car" -> R.drawable.ic_user_car
            else -> R.drawable.ic_user_runner
        }
    }

    suspend fun setUserIcon(iconName: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_ICON_KEY] = iconName
        }
    }

    val activeTrailUuid: Flow<String?> = context.dataStore.data.map { it[ACTIVE_TRAIL_UUID_KEY] }
    val activeRunUuid: Flow<String?> = context.dataStore.data.map { it[ACTIVE_RUN_UUID_KEY] }
    val activeStartTime: Flow<Long> = context.dataStore.data.map { it[ACTIVE_START_TIME_KEY] ?: 0L }
    val activeSessionUuid: Flow<String?> = context.dataStore.data.map { it[ACTIVE_SESSION_UUID_KEY] }

    suspend fun setActiveRace(trailUuid: String?, runUuid: String?, startTime: Long, sessionUuid: String?) {
        context.dataStore.edit { prefs ->
            if (trailUuid == null) {
                prefs.remove(ACTIVE_TRAIL_UUID_KEY)
                prefs.remove(ACTIVE_RUN_UUID_KEY)
                prefs.remove(ACTIVE_START_TIME_KEY)
                prefs.remove(ACTIVE_SESSION_UUID_KEY)
            } else {
                prefs[ACTIVE_TRAIL_UUID_KEY] = trailUuid
                prefs[ACTIVE_RUN_UUID_KEY] = runUuid ?: ""
                prefs[ACTIVE_START_TIME_KEY] = startTime
                if (sessionUuid != null) prefs[ACTIVE_SESSION_UUID_KEY] = sessionUuid
                else prefs.remove(ACTIVE_SESSION_UUID_KEY)
            }
        }
    }
}
