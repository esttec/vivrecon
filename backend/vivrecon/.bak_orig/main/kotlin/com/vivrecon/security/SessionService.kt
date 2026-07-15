package com.vivrecon.security

import com.vivrecon.domain.UserEntity
import com.vivrecon.domain.UserSessionEntity
import com.vivrecon.repo.UserSessionRepository
import org.springframework.stereotype.Service
import java.time.OffsetDateTime

@Service
class SessionService(
    private val userSessionRepository: UserSessionRepository
) {
    fun getOrCreate(
        user: UserEntity,
        deviceId: String,
        deviceName: String?,
        userAgent: String?,
        ip: String?
    ): UserSessionEntity {
        val existing = userSessionRepository.findByUserIdAndDeviceId(user.id!!, deviceId)
        if (existing != null) {
            if (existing.revokedAt != null) {
                // device was revoked earlier — create a fresh session record by "unrevoking"
                existing.revokedAt = null
            }
            existing.deviceName = deviceName ?: existing.deviceName
            existing.userAgent = userAgent ?: existing.userAgent
            existing.ip = ip ?: existing.ip
            existing.lastUsedAt = OffsetDateTime.now()
            return userSessionRepository.save(existing)
        }

        val s = UserSessionEntity().apply {
            this.user = user
            this.deviceId = deviceId
            this.deviceName = deviceName
            this.userAgent = userAgent
            this.ip = ip
            this.lastUsedAt = OffsetDateTime.now()
        }
        return userSessionRepository.save(s)
    }
}
