package com.vivrecon.service

import com.vivrecon.domain.AuthProvider
import com.vivrecon.domain.ProfileEntity
import com.vivrecon.domain.RefreshTokenEntity
import com.vivrecon.domain.UserEntity
import com.vivrecon.domain.UserSessionEntity
import com.vivrecon.dto.*
import com.vivrecon.repo.ProfileRepository
import com.vivrecon.repo.RefreshTokenRepository
import com.vivrecon.repo.UserRepository
import com.vivrecon.repo.UserSessionRepository
import com.vivrecon.security.JwtUtil
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class AuthService(
    private val userRepo: UserRepository,
    private val refreshTokenRepo: RefreshTokenRepository,
    private val sessionRepo: UserSessionRepository,
    private val profileRepo: ProfileRepository,
    private val jwtUtil: JwtUtil,
    private val passwordEncoder: PasswordEncoder,
    @Value("\${vivrecon.jwt.refresh-token-expiry-days:30}") private val refreshExpiryDays: Long
) {

    @Transactional
    fun register(req: RegisterRequest, deviceInfo: String, ipAddress: String): AuthResponse {
        require(!userRepo.existsByEmail(req.email.lowercase())) { "Email already in use" }
        val user = userRepo.save(
            UserEntity(
                email = req.email.lowercase(),
                passwordHash = passwordEncoder.encode(req.password),
                provider = AuthProvider.LOCAL
            )
        )
        // Record where the client signed up from (country resolved from IP later/offline).
        profileRepo.save(ProfileEntity(user = user, signupIp = ipAddress))
        return issueTokens(user, deviceInfo)
    }

    @Transactional
    fun login(req: LoginRequest, deviceInfo: String): AuthResponse {
        val user = userRepo.findByEmail(req.email.lowercase())
            .orElseThrow { IllegalArgumentException("Invalid credentials") }

        // Social-only accounts cannot use password login
        require(user.provider == AuthProvider.LOCAL) {
            "This account uses ${user.provider.name.lowercase()} login. Please use that instead."
        }
        require(passwordEncoder.matches(req.password, user.passwordHash)) { "Invalid credentials" }
        return issueTokens(user, deviceInfo)
    }

    @Transactional
    fun refresh(req: RefreshRequest): AuthResponse {
        val stored = refreshTokenRepo.findByToken(req.refreshToken)
            .orElseThrow { IllegalArgumentException("Invalid refresh token") }
        require(!stored.revoked) { "Refresh token revoked" }
        require(stored.expiresAt.isAfter(Instant.now())) { "Refresh token expired" }

        // rotate: revoke old, issue new
        stored.revoked = true
        refreshTokenRepo.save(stored)
        return issueTokens(stored.user, "token-refresh")
    }

    @Transactional
    fun logout(userId: Long) {
        refreshTokenRepo.deleteAllByUserId(userId)
        sessionRepo.findAllByUserIdAndActiveTrue(userId).forEach {
            it.active = false
            sessionRepo.save(it)
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    internal fun issueTokens(user: UserEntity, deviceInfo: String): AuthResponse {
        val accessToken = jwtUtil.generateAccessToken(user.id, user.email)
        val rawRefresh = UUID.randomUUID().toString()
        refreshTokenRepo.save(
            RefreshTokenEntity(
                user = user,
                token = rawRefresh,
                expiresAt = Instant.now().plusSeconds(refreshExpiryDays * 86400)
            )
        )
        sessionRepo.save(UserSessionEntity(user = user, deviceInfo = deviceInfo))
        return AuthResponse(
            accessToken = accessToken,
            refreshToken = rawRefresh,
            disclaimerAccepted = user.disclaimerAccepted
        )
    }
}
