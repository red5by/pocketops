package com.pocketops

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BiometricModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BiometricAuth"

    @ReactMethod
    fun authenticate(promise: Promise) {
        val activity = currentActivity as? FragmentActivity
            ?: return promise.reject("NO_ACTIVITY", "Activity not available")

        val manager = BiometricManager.from(reactApplicationContext)
        val allowedAuth =
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL

        if (manager.canAuthenticate(allowedAuth) != BiometricManager.BIOMETRIC_SUCCESS) {
            return promise.reject("NOT_AVAILABLE", "Biometric not available on this device")
        }

        val executor = ContextCompat.getMainExecutor(reactApplicationContext)

        activity.runOnUiThread {
            val prompt = BiometricPrompt(
                activity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult,
                    ) {
                        promise.resolve(true)
                    }

                    override fun onAuthenticationError(code: Int, msg: CharSequence) {
                        promise.reject("AUTH_ERROR", msg.toString())
                    }

                    override fun onAuthenticationFailed() {
                        // ユーザーが再試行できるよう reject しない
                    }
                },
            )

            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle("PocketOps 認証")
                .setSubtitle("インフラ操作のため認証してください")
                .setAllowedAuthenticators(allowedAuth)
                .build()

            prompt.authenticate(info)
        }
    }
}
