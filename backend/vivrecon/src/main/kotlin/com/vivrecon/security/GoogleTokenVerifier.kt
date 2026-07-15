package com.vivrecon.security

import com.vivrecon.domain.AuthProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import java.util.Base64

/**
 * Verifies a Google ID-token (issued after Sign in with Google / Google One Tap).
 *
 * Flow on the mobile side:
 *   1. User taps "Continue with Google"
 *   2. Google SDK returns an idToken (JWT)
 *   3. Mobile sends that idToken to POST /api/auth/social/google
 *   4. We verify it here against Google's tokeninfo endpoint
 *
 * For production you should verify the JWT signature locally using Google's
 * public JWKS (https://www.googleapis.com/oauth2/v3/certs) to avoid a network
 * hop, but verifying via tokeninfo is simpler and perfectly valid.
 */
@Component
class GoogleTokenVerifier(
    @Value("\${vivrecon.oauth.google.client-id}") private val clientId: String,
    private val mapper: ObjectMapper
) {
    private val rest = RestTemplate()

    fun verify(idToken: String): OAuthUserInfo {
        val url = "https://oauth2.googleapis.com/tokeninfo?id_token=$idToken"
        val response = try {
            rest.getForObject(url, String::class.java)
                ?: throw IllegalArgumentException("Empty response from Google tokeninfo")
        } catch (ex: Exception) {
            throw IllegalArgumentException("Google token verification failed: ${ex.message}")
        }

        val json = mapper.readTree(response)

        // Validate audience
        val aud = json.get("aud")?.asText()
            ?: throw IllegalArgumentException("Missing aud in Google token")
        require(aud == clientId) { "Google token audience mismatch" }

        // Validate expiry
        val exp = json.get("exp")?.asLong()
            ?: throw IllegalArgumentException("Missing exp in Google token")
        require(exp > System.currentTimeMillis() / 1000) { "Google token expired" }

        val sub = json.get("sub")?.asText()
            ?: throw IllegalArgumentException("Missing sub in Google token")
        val email = json.get("email")?.asText()
            ?: throw IllegalArgumentException("Missing email in Google token")
        val name = json.get("name")?.asText()
        val picture = json.get("picture")?.asText()

        return OAuthUserInfo(
            provider = AuthProvider.GOOGLE,
            providerId = sub,
            email = email,
            displayName = name,
            avatarUrl = picture
        )
    }
}
