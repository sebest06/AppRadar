package com.appradar.wear.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
        apiUrl = savedApiUrl
    }

    LaunchedEffect(loginSuccess) {
        if (loginSuccess == true) {
            onLoginSuccess()
        } else if (loginSuccess == false) {
            errorMessage = "Error"
            viewModel.resetLoginStatus()
        }
    }

    Scaffold(
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) }
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            contentPadding = PaddingValues(top = 24.dp, bottom = 24.dp, start = 8.dp, end = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Text(
                    text = "Login",
                    style = MaterialTheme.typography.title3,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            item {
                CompactChip(
                    onClick = { /* Podrías abrir un diálogo para editar la URL */ },
                    label = { Text(apiUrl, maxLines = 1) },
                    colors = ChipDefaults.secondaryChipColors(),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                // En Wear OS los TextField no son estándar, se suele usar chips que abren el teclado
                // Simplificamos con campos básicos para el ejemplo
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
                    label = "Password",
                    isPassword = true
                )
            }

            if (errorMessage != null) {
                item {
                    Text(
                        text = errorMessage!!,
                        color = MaterialTheme.colors.error,
                        style = MaterialTheme.typography.caption2
                    )
                }
            }

            item {
                Button(
                    onClick = {
                        if (username.isNotBlank() && password.isNotBlank()) {
                            viewModel.login(apiUrl, username, password)
                        }
                    },
                    modifier = Modifier.size(ButtonDefaults.DefaultButtonSize)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    } else {
                        Text("OK")
                    }
                }
            }
        }
    }
}

@Composable
fun TextInputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    isPassword: Boolean = false
) {
    // Implementación simplificada para Wear OS
    // Normalmente aquí usarías RemoteInput o un diálogo
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(label, style = MaterialTheme.typography.caption2, modifier = Modifier.padding(start = 8.dp))
        // Simulamos el input con un chip por ahora (en Wear OS real usarías un diálogo de texto)
        Chip(
            onClick = { /* Abrir diálogo de entrada de texto */ },
            label = { Text(if (isPassword && value.isNotEmpty()) "********" else value.ifEmpty { "Toca para escribir" }) },
            colors = ChipDefaults.secondaryChipColors(),
            modifier = Modifier.fillMaxWidth()
        )
    }
}
