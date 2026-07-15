package com.vivrecon.security

import com.vivrecon.domain.AuthProvider
import com.fasterxml.jackson.databind.ObjectMapper
import io.jsonwebtoken.Jwts
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import java.math.BigInteger
import java.security.KeyFactory
import java.security.PublicKey
import java.security.spec.RSAPublicKeySpec
import java.util.Base64

/**
 * Verifies Apple Sign In identity tokens.
 *
 * Apple does NOT provide a simple tokeninfo endpoint like Google.
 * We must:
 *   1. Fetch Apple's public JWKS from https://appleid.apple.com/auth/keys
 *   2. Find the key matching the token's `kid` header
 *   3. Reconstruct the RSA public key from the JWK's n + e values
 *   4. Verify the JWT signature locally
 *
 * Mobile flow:
 *   1. User taps "Sign in with Apple"
 *   2. Apple SDK returns an identityToken (JWT)
 *   3. Mobile sends identityToken to POST /api/auth/social/apple
 *   4. We verify here and return our own access/refresh tokens
 *
 * Note: Apple only sends the user's name on the FIRST login.
 *       On subsequent logins the name is absent — persist it on first sign-in.
 */
@Component
class AppleTokenVerifier(
    @Value("\${vivrecon.oauth.apple.client-id}") private val clientId: String,
    private val mapper: ObjectMapper
) {
    private val rest = RestTemplate()
    private val appleKeysUrl = "https://appleid.apple.com/auth/keys"

    fun verify(identityToken: String, fullNameHint: String?): OAuthUserInfo {
        // 1. Parse the header to get kid + alg (don't verify yet)
        val parts = identityToken.split(".")
        require(parts.size == 3) { "Not a valid JWT" }

        val headerJson = mapper.readTree(String(Base64.getUrlDecoder().decode(parts[0])))
        val kid = headerJson.get("kid")?.asText()
            ?: throw IllegalArgumentException("Missing kid in Apple token header")

        // 2. Fetch Apple's public keys
        val keysJson = rest.getForObject(appleKeysUrl, String::class.java)
            ?: throw IllegalArgumentException("Could not fetch Apple public keys")
        val keysNode = mapper.readTree(keysJson)

        val keyNode = keysNode["keys"]?.firstOrNull { it["kid"]?.asText() == kid }
            ?: throw IllegalArgumentException("No matching Apple public key for kid=$kid")

        // 3. Reconstruct RSA public key from JWK n + e
        val publicKey = buildRsaPublicKey(
            n = keyNode["n"].asText(),
            e = keyNode["e"].asText()
        )

        // 4. Verify signature and parse claims
        val claims = try {
            Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(identityToken)
                .payload
        } catch (ex: Exception) {
            throw IllegalArgumentException("Apple token verification failed: ${ex.message}")
        }

        // Validate audience (= your app's bundle ID / service ID)
        val aud = claims.audience.firstOrNull()
            ?: throw IllegalArgumentException("Missing aud in Apple token")
        require(aud == clientId) { "Apple token audience mismatch" }

        // Validate issuer
        require(claims.issuer == "https://appleid.apple.com") { "Apple token issuer invalid" }

        val sub = claims.subject ?: throw IllegalArgumentException("Missing sub in Apple token")
        val email = claims["email"] as? String
            ?: throw IllegalArgumentException("Missing email in Apple token")

        return OAuthUserInfo(
            provider = AuthProvider.APPLE,
            providerId = sub,
            email = email,
            displayName = fullNameHint,   // only present on first sign-in
            avatarUrl = null              // Apple does not provide avatars
        )
    }

    private fun buildRsaPublicKey(n: String, e: String): PublicKey {
        val decoder = Base64.getUrlDecoder()
        val modulus = BigInteger(1, decoder.decode(n))
        val exponent = BigInteger(1, decoder.decode(e))
        val spec = RSAPublicKeySpec(modulus, exponent)
        return KeyFactory.getInstance("RSA").generatePublic(spec)
    }
}
