package com.vivrecon.api

import com.vivrecon.repo.UserSessionRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.time.OffsetDateTime

data class SessionDto(
    val id: Long,
    val deviceId: String,
    val deviceName: String?,
    val lastUsedAt: OffsetDateTime,
    val createdAt: OffsetDateTime,
    val revokedAt: OffsetDateTime?
)

@RestController
@RequestMapping("/api/auth")
class SessionsController(
    private val userSessionRepository: UserSessionRepository
) {
    @GetMapping("/sessions")
    fun list(): List<SessionDto> {
        val userId = SecurityContextHolder.getContext().authentication.principal.toString().toLong()
        return userSessionRepository.findAllByUserIdOrderByLastUsedAtDesc(userId).map {
            SessionDto(
                id = it.id!!,
                deviceId = it.deviceId,
                deviceName = it.deviceName,
                lastUsedAt = it.lastUsedAt,
                createdAt = it.createdAt,
                revokedAt = it.revokedAt
            )
        }
    }

    @PostMapping("/sessions/{id}/revoke")
    fun revoke(@PathVariable id: Long): Map<String, String> {
        val userId = SecurityContextHolder.getContext().authentication.principal.toString().toLong()
        val s = userSessionRepository.findById(id).orElseThrow { IllegalArgumentException("Not found") }
        if (s.user.id != userId) throw IllegalArgumentException("Not found")

        s.revokedAt = OffsetDateTime.now()
        userSessionRepository.save(s)
        return mapOf("status" to "ok")
    }
}
