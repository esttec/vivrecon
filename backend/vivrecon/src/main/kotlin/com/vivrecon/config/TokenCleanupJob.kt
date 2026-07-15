package com.vivrecon.config

import com.vivrecon.repo.RefreshTokenRepository
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant

/**
 * Periodic cleanup of expired refresh tokens so the table doesn't grow unbounded.
 * Runs every night at 02:00 UTC.
 */
@Component
class TokenCleanupJob(private val refreshTokenRepo: RefreshTokenRepository) {

    @Scheduled(cron = "0 0 2 * * *")
    fun purgeExpiredTokens() {
        refreshTokenRepo.deleteAllByExpiresAtBefore(Instant.now())
    }
}
