package com.appradar.data.remote

import com.appradar.util.UserPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class DynamicBaseUrlInterceptor @Inject constructor(
    private val userPreferences: UserPreferences
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val newBaseUrl = runBlocking { userPreferences.apiUrl.first() }
        
        val newUrl = originalRequest.url.newBuilder()
            .apply {
                val httpUrl = newBaseUrl.toHttpUrlOrNull()
                if (httpUrl != null) {
                    scheme(httpUrl.scheme)
                    host(httpUrl.host)
                    port(httpUrl.port)
                }
            }
            .build()
            
        return chain.proceed(originalRequest.newBuilder().url(newUrl).build())
    }
}
