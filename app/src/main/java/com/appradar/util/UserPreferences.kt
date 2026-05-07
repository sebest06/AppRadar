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
}
