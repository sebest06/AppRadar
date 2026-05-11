package com.appradar.wear.data.remote

import com.appradar.wear.util.WearUserPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class WearDynamicUrlInterceptor @Inject constructor(
    private val userPreferences: WearUserPreferences
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val (baseUrl, token) = runBlocking {
            userPreferences.apiUrl.first() to userPreferences.authToken.first()
        }

        val newUrl = chain.request().url.newBuilder().apply {
            baseUrl.toHttpUrlOrNull()?.let { parsed ->
                scheme(parsed.scheme)
                host(parsed.host)
                port(parsed.port)
            }
        }.build()

        val request = chain.request().newBuilder().url(newUrl).apply {
            token?.let { header("Authorization", "Bearer $it") }
        }.build()

        return chain.proceed(request)
    }
}
