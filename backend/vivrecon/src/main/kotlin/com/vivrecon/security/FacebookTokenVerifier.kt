package com.vivrecon.security

import com.vivrecon.domain.AuthProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

/**
 * Verifies a Facebook user access-token via the Graph API debug endpoint.
 *
 * Mobile flow:
 *   1. User taps "Continue with Facebook"
 *   2. Facebook SDK returns an accessToken
 *   3. Mobile sends that accessToken to POST /api/auth/social/facebook
 *   4. We verify it here: first inspect the token, then fetch the user's email
 *
 * Requirements:
 *   - Your Facebook App must have the `email` permission approved
 *   - You need a server-side App Access Token (APP_ID|APP_SECRET) to call
 *     the debug_token endpoint
 */
@Component
class FacebookTokenVerifier(
    @Value("\${vivrecon.oauth.facebook.app-id}") private val appId: String,
    @Value("\${vivrecon.oauth.facebook.app-secret}") private val appSecret: String,
    private val mapper: ObjectMapper
) {
    private val rest = RestTemplate()
    private val appAccessToken get() = "$appId|$appSecret"

    fun verify(accessToken: String): OAuthUserInfo {
        // 1. Inspect the token to confirm it belongs to our app and is valid
        val debugUrl = "https://graph.facebook.com/debug_token" +
                "?input_token=$accessToken&access_token=$appAccessToken"

        val debugResponse = try {
            rest.getForObject(debugUrl, String::class.java)
                ?: throw IllegalArgumentException("Empty debug_token response")
        } catch (ex: Exception) {
            throw IllegalArgumentException("Facebook token debug failed: ${ex.message}")
        }

        val debugJson = mapper.readTree(debugResponse)["data"]
            ?: throw IllegalArgumentException("Unexpected debug_token response shape")

        val isValid = debugJson["is_valid"]?.asBoolean() ?: false
        require(isValid) { "Facebook access token is not valid" }

        val tokenAppId = debugJson["app_id"]?.asText()
        require(tokenAppId == appId) { "Facebook token app_id mismatch" }

        val userId = debugJson["user_id"]?.asText()
            ?: throw IllegalArgumentException("Missing user_id in Facebook debug response")

        // 2. Fetch the user's profile + email from the Graph API
        val profileUrl = "https://graph.facebook.com/v19.0/me" +
                "?fields=id,name,email,picture.type(large)&access_token=$accessToken"

        val profileResponse = try {
            rest.getForObject(profileUrl, String::class.java)
                ?: throw IllegalArgumentException("Empty Graph API response")
        } catch (ex: Exception) {
            throw IllegalArgumentException("Facebook Graph API call failed: ${ex.message}")
        }

        val profileJson = mapper.readTree(profileResponse)

        val email = profileJson["email"]?.asText()
            ?: throw IllegalArgumentException(
                "No email returned by Facebook. Make sure the `email` permission is granted."
            )
        val name = profileJson["name"]?.asText()
        val avatar = profileJson["picture"]?.get("data")?.get("url")?.asText()

        return OAuthUserInfo(
            provider = AuthProvider.FACEBOOK,
            providerId = userId,
            email = email,
            displayName = name,
            avatarUrl = avatar
        )
    }
}
