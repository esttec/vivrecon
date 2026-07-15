package com.vivrecon.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtUtil(
    @Value("\${vivrecon.jwt.secret}") private val secret: String,
    @Value("\${vivrecon.jwt.access-token-expiry-ms:900000}") private val accessTokenExpiryMs: Long  // 15 min default
) {
    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(secret.toByteArray())
    }

    fun generateAccessToken(userId: Long, email: String): String {
        val now = Date()
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .issuedAt(now)
            .expiration(Date(now.time + accessTokenExpiryMs))
            .signWith(key)
            .compact()
    }

    fun validateAndGetClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
    }

    fun getUserId(token: String): Long =
        validateAndGetClaims(token).subject.toLong()
}
