package com.vivrecon.dto

// ── Social Auth Requests ──────────────────────────────────────────────────────

/**
 * Mobile sends the Google ID token obtained from the Google Sign-In SDK.
 */
data class GoogleAuthRequest(
    val idToken: String
)

/**
 * Mobile sends the Apple identity token obtained from ASAuthorizationAppleIDCredential.
 * fullName is ONLY present on the first sign-in — Apple does not return it again.
 * The mobile app must pass it immediately after the first successful sign-in.
 */
data class AppleAuthRequest(
    val identityToken: String,
    val fullName: String? = null
)

/**
 * Mobile sends the Facebook access token obtained from the Facebook Login SDK.
 */
data class FacebookAuthRequest(
    val accessToken: String
)
