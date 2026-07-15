package com.vivrecon.service

import com.vivrecon.domain.*
import com.vivrecon.dto.AuthResponse
import com.vivrecon.repo.ProfileRepository
import com.vivrecon.repo.RefreshTokenRepository
import com.vivrecon.repo.UserRepository
import com.vivrecon.repo.UserSessionRepository
import com.vivrecon.security.*
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class OAuthService(
    private val userRepo: UserRepository,
    private val refreshTokenRepo: RefreshTokenRepository,
    private val sessionRepo: UserSessionRepository,
    private val profileRepo: ProfileRepository,
    private val jwtUtil: JwtUtil,
    private val googleVerifier: GoogleTokenVerifier,
    private val appleVerifier: AppleTokenVerifier,
    private val facebookVerifier: FacebookTokenVerifier,
    @Value("\${vivrecon.jwt.refresh-token-expiry-days:30}") private val refreshExpiryDays: Long
) {

    // ── Public entry points (one per provider) ────────────────────────────────

    @Transactional
    fun loginWithGoogle(idToken: String, deviceInfo: String, ipAddress: String): AuthResponse {
        val info = googleVerifier.verify(idToken)
        return loginWithProvider(info, deviceInfo, ipAddress)
    }

    @Transactional
    fun loginWithApple(identityToken: String, fullName: String?, deviceInfo: String, ipAddress: String): AuthResponse {
        val info = appleVerifier.verify(identityToken, fullName)
        return loginWithProvider(info, deviceInfo, ipAddress)
    }

    @Transactional
    fun loginWithFacebook(accessToken: String, deviceInfo: String, ipAddress: String): AuthResponse {
        val info = facebookVerifier.verify(accessToken)
        return loginWithProvider(info, deviceInfo, ipAddress)
    }

    // ── Core: find or create, then issue tokens ───────────────────────────────

    private fun loginWithProvider(info: OAuthUserInfo, deviceInfo: String, ipAddress: String): AuthResponse {
        var isNewUser = false

        // 1. Look up by provider + providerId (most reliable)
        val user = userRepo.findByProviderAndProviderId(info.provider, info.providerId)
            .orElseGet {
                // 2. Fall back to email lookup — user may have registered locally before
                userRepo.findByEmail(info.email.lowercase()).orElseGet {
                    // 3. Brand new user — create the account
                    isNewUser = true
                    userRepo.save(
                        UserEntity(
                            email = info.email.lowercase(),
                            provider = info.provider,
                            providerId = info.providerId,
                            displayName = info.displayName,
                            avatarUrl = info.avatarUrl
                        )
                    )
                }
            }

        // Keep display name / avatar fresh (Apple only sends name on first login, so guard with ?: )
        if (info.displayName != null && user.displayName == null) user.displayName = info.displayName
        if (info.avatarUrl != null) user.avatarUrl = info.avatarUrl
        userRepo.save(user)

        // Record signup location once, when the account is first created.
        if (isNewUser && profileRepo.findByUserId(user.id).isEmpty) {
            profileRepo.save(ProfileEntity(user = user, signupIp = ipAddress))
        }

        return issueTokens(user, deviceInfo)
    }

    // ── Token issuance (same as AuthService) ──────────────────────────────────

    private fun issueTokens(user: UserEntity, deviceInfo: String): AuthResponse {
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
