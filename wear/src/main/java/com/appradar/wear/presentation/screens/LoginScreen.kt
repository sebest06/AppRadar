package com.appradar.wear.presentation.screens

import android.content.Intent
import android.view.inputmethod.EditorInfo
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.appradar.wear.presentation.viewmodel.LoginViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val isLoading by viewModel.isLoading.collectAsState()
    val loginSuccess by viewModel.loginSuccess.collectAsState()
    val savedApiUrl by viewModel.apiUrl.collectAsState()

    var apiUrl by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val listState = rememberScalingLazyListState()

    LaunchedEffect(savedApiUrl) {
        if (apiUrl.isEmpty()) apiUrl = savedApiUrl
    }

    LaunchedEffect(loginSuccess) {
        if (loginSuccess == true) {
            onLoginSuccess()
        } else if (loginSuccess == false) {
            errorMessage = "Error de login"
            viewModel.resetLoginStatus()
        }
    }

    Scaffold(
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) }
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            contentPadding = PaddingValues(top = 32.dp, bottom = 32.dp, start = 8.dp, end = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Text(
                    text = "AppRadar Login",
                    style = MaterialTheme.typography.title3,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            item {
                TextInputField(
                    value = apiUrl,
                    onValueChange = { apiUrl = it },
                    label = "URL Servidor",
                    placeholder = "http://..."
                )
            }

            item {
                TextInputField(
                    value = username,
                    onValueChange = { username = it },
                    label = "Usuario"
                )
            }

            item {
                TextInputField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Contraseña",
                    isPassword = true
                )
            }

            if (errorMessage != null) {
                item {
                    Text(
                        text = errorMessage!!,
                        color = MaterialTheme.colors.error,
                        style = MaterialTheme.typography.caption2,
                        textAlign = TextAlign.Center
                    )
                }
            }

            item {
                Button(
                    onClick = {
                        if (username.isNotBlank() && password.isNotBlank()) {
                            viewModel.login(apiUrl, username, password)
                        } else {
                            errorMessage = "Campos vacíos"
                        }
                    },
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    } else {
                        Text("ENTRAR")
                    }
                }
            }
            
            item {
                Text(
                    text = "También puedes sincronizar desde el teléfono",
                    style = MaterialTheme.typography.caption3,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 12.dp, start = 12.dp, end = 12.dp)
                )
            }
        }
    }
}

@Composable
fun TextInputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "Toca para escribir",
    isPassword: Boolean = false
) {
    // Launcher para abrir el diálogo de entrada de texto del sistema Wear OS
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val data = result.data ?: return@rememberLauncherForActivityResult
            val results = androidx.core.app.RemoteInput.getResultsFromIntent(data)
            results?.getCharSequence("extra_text")?.let {
                onValueChange(it.toString())
            }
        }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(
            text = label, 
            style = MaterialTheme.typography.caption2, 
            modifier = Modifier.padding(start = 8.dp),
            color = MaterialTheme.colors.secondary
        )
        Chip(
            onClick = {
                // Intent estándar de Wear OS para pedir texto
                val remoteInput = androidx.core.app.RemoteInput.Builder("extra_text")
                    .setLabel(label)
                    .build()
                
                val remoteIntent = Intent("com.google.android.wearable.action.REMOTE_INPUT")
                remoteIntent.putExtra("androidx.core.app.RemoteInput.extra_inputs", arrayOf(remoteInput))
                
                try {
                    launcher.launch(remoteIntent)
                } catch (_: Exception) {}
            },
            label = { 
                Text(
                    text = if (isPassword && value.isNotEmpty()) "********" else value.ifEmpty { placeholder },
                    maxLines = 1
                ) 
            },
            colors = ChipDefaults.secondaryChipColors(),
            modifier = Modifier.fillMaxWidth()
        )
    }
}
