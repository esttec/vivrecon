package com.vivrecon.repo

import com.vivrecon.domain.UserSessionEntity
import org.springframework.data.jpa.repository.JpaRepository

interface UserSessionRepository : JpaRepository<UserSessionEntity, Long> {
    fun findByUserIdAndDeviceId(userId: Long, deviceId: String): UserSessionEntity?
    fun findAllByUserIdOrderByLastUsedAtDesc(userId: Long): List<UserSessionEntity>
}