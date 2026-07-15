package com.vivrecon.security

import com.vivrecon.domain.RefreshTokenEntity
import com.vivrecon.domain.UserEntity
import com.vivrecon.domain.UserSessionEntity
import com.vivrecon.repo.RefreshTokenRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.OffsetDateTime
import java.util.Base64

data class RotatedResult(val user: UserEntity, val session: UserSessionEntity)

@Service
class RefreshTokenService(
    private val refreshTokenRepository: RefreshTokenRepository,
    @Value("\${app.jwt.refreshDays:30}") private val refreshDays: Long
) {
    private val rng = SecureRandom()

    fun issue(user: UserEntity, session: UserSessionEntity): String {
        val raw = generateRawToken()
        val hash = sha256(raw)

        val entity = RefreshTokenEntity().apply {
            this.user = user
            this.tokenHash = hash
            this.expiresAt = OffsetDateTime.now().plusDays(refreshDays)
        }

        refreshTokenRepository.save(entity)
        return raw
    }

    fun rotate(rawToken: String): UserEntity? {
        val hash = sha256(rawToken)
        val existing = refreshTokenRepository.findByTokenHash(hash) ?: return null

        val now = OffsetDateTime.now()
        if (existing.session.revokedAt != null) return null
        if (existing.revokedAt != null) return null
        if (existing.expiresAt.isBefore(now)) return null

        // revoke old
        existing.revokedAt = now
        refreshTokenRepository.save(existing)

        return existing.user
    }

    fun rotateWithSession(rawToken: String): RotatedResult? {
        val hash = sha256(rawToken)
        val existing = refreshTokenRepository.findByTokenHash(hash) ?: return null

        val now = OffsetDateTime.now()
        if (existing.session.revokedAt != null) return null
        if (existing.revokedAt != null) return null
        if (existing.expiresAt.isBefore(now)) return null

        // revoke old
        existing.revokedAt = now
        refreshTokenRepository.save(existing)

        return RotatedResult(user = existing.user, session = existing.session)
    }

    private fun generateRawToken(): String {
        val bytes = ByteArray(48)
        rng.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun sha256(raw: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(raw.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun revoke(rawToken: String): Boolean {
        val hash = sha256(rawToken)
        val existing = refreshTokenRepository.findByTokenHash(hash) ?: return false
        if (existing.revokedAt != null) return false
        existing.revokedAt = OffsetDateTime.now()
        refreshTokenRepository.save(existing)
        return true
    }
}