package com.vivrecon.api

import com.vivrecon.domain.UserSessionEntity
import com.vivrecon.dto.SessionResponse
import com.vivrecon.repo.UserSessionRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/sessions")
class SessionsController(private val sessionRepo: UserSessionRepository) {

    @GetMapping
    fun list(): ResponseEntity<List<SessionResponse>> {
        val userId = currentUserId()
        val sessions = sessionRepo.findAllByUserIdAndActiveTrue(userId).map { it.toDto() }
        return ResponseEntity.ok(sessions)
    }

    @DeleteMapping("/{id}")
    fun revoke(@PathVariable id: Long): ResponseEntity<Void> {
        val userId = currentUserId()
        val session = sessionRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Session not found") }
        session.active = false
        sessionRepo.save(session)
        return ResponseEntity.noContent().build()
    }

    private fun UserSessionEntity.toDto() = SessionResponse(
        id = id,
        deviceInfo = deviceInfo,
        createdAt = createdAt.toString(),
        lastSeenAt = lastSeenAt.toString(),
        active = active
    )
}
