package com.vivrecon.security

import com.vivrecon.domain.AuthProvider

/**
 * Normalised user information extracted from a provider's ID-token or access-token.
 * Each verifier produces one of these; the AuthService consumes it uniformly.
 */
data class OAuthUserInfo(
    val provider: AuthProvider,
    val providerId: String,   // the provider's own user identifier (sub / id)
    val email: String,
    val displayName: String?,
    val avatarUrl: String?
)
