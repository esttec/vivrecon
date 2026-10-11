package com.vivrecon.service

import com.vivrecon.domain.AuthProvider
import com.vivrecon.repo.RefreshTokenRepository
import com.vivrecon.repo.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.sql.Timestamp
import java.time.Instant
import java.util.Base64

@Service
class PasswordResetService(
    private val userRepo: UserRepository,
    private val refreshTokenRepo: RefreshTokenRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jdbc: JdbcTemplate,
    private val mailSender: ObjectProvider<JavaMailSender>,
    @Value("\${spring.mail.host:}") private val smtpHost: String,
    @Value("\${MAIL_FROM:}") private val mailFrom: String,
    @Value("\${APP_BASE_URL:http://localhost:5173}") private val baseUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** Always succeeds silently, so the endpoint does not reveal which emails are registered. */
    @Transactional
    fun requestReset(email: String) {
        val user = userRepo.findByEmail(email.trim().lowercase()).orElse(null) ?: return
        if (user.provider != AuthProvider.LOCAL) return
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also { SecureRandom().nextBytes(it) })
        jdbc.update("DELETE FROM password_reset_tokens WHERE user_id = ?", user.id)
        jdbc.update("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            sha256(token), user.id, Timestamp.from(Instant.now().plusSeconds(3600)))
        val link = "$baseUrl/login?reset=$token"
        val sender = mailSender.ifAvailable
        if (smtpHost.isBlank() || sender == null) {
            // shortcut: no SMTP configured yet, so the admin copies the link from the server log
            log.warn("SMTP not configured. Password reset link for user {}: {}", user.id, link)
            return
        }
        try {
            sender.send(SimpleMailMessage().apply {
                setTo(user.email)
                if (mailFrom.isNotBlank()) from = mailFrom
                subject = "vivrecon password reset"
                text = "Open this link to choose a new password (valid for 1 hour):\n\n$link\n\nIf you did not ask for this, ignore this email."
            })
        } catch (ex: Exception) {
            log.error("Could not send reset email to user {}: {}", user.id, ex.message)
        }
    }

    @Transactional
    fun reset(token: String, newPassword: String) {
        require(newPassword.length >= 8) { "Password must be at least 8 characters" }
        val userId = jdbc.query(
            "DELETE FROM password_reset_tokens WHERE token_hash = ? AND expires_at > now() RETURNING user_id",
            { rs, _ -> rs.getLong(1) }, sha256(token)
        ).firstOrNull() ?: throw IllegalArgumentException("This reset link is invalid or has expired")
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", passwordEncoder.encode(newPassword), userId)
        refreshTokenRepo.deleteAllByUserId(userId) // sign out every device
    }

    private fun sha256(s: String) =
        MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }
}
