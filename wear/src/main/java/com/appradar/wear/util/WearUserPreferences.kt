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
}
