package com.vivrecon.api

import com.vivrecon.domain.UserEntity
import com.vivrecon.repo.UserRepository
import com.vivrecon.security.JwtService
import com.vivrecon.security.RefreshTokenService
import com.vivrecon.security.SessionService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

data class RegisterRequest(val email: String, val password: String, val deviceId: String, val deviceName: String? = null)
data class LoginRequest(val email: String, val password: String, val deviceId: String, val deviceName: String? = null)
data class RefreshRequest(val refreshToken: String)

data class AuthResponse(
    val userId: Long,
    val email: String,
    val accessToken: String,
    val refreshToken: String
)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val refreshTokenService: RefreshTokenService,
    private val sessionService: SessionService
) {

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@RequestBody req: RegisterRequest, request: HttpServletRequest): AuthResponse {
        val email = req.email.lowercase().trim()

        require(email.isNotBlank()) { "Email is required" }
        require(req.password.length >= 8) { "Password must be at least 8 characters" }
        require(req.deviceId.isNotBlank()) { "deviceId is required" }

        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("Email already exists")
        }

        val user = userRepository.save(
            UserEntity(
                email = email,
                passwordHash = passwordEncoder.encode(req.password),
                isActive = true
            )
        )

        val session = sessionService.getOrCreate(
            user = user,
            deviceId = req.deviceId,
            deviceName = req.deviceName,
            userAgent = request.getHeader("User-Agent"),
            ip = request.remoteAddr
        )

        val access = jwtService.createAccessToken(user.id!!, user.email)
        val refresh = refreshTokenService.issue(user, session)
        return AuthResponse(userId = user.id!!, email = user.email, accessToken = access, refreshToken = refresh)
    }

    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest, request: HttpServletRequest): AuthResponse {
        val email = req.email.lowercase().trim()

        require(req.deviceId.isNotBlank()) { "deviceId is required" }

        val user = userRepository.findByEmail(email)
            ?: throw IllegalArgumentException("Invalid credentials")

        if (!passwordEncoder.matches(req.password, user.passwordHash)) {
            throw IllegalArgumentException("Invalid credentials")
        }

        val session = sessionService.getOrCreate(
            user = user,
            deviceId = req.deviceId,
            deviceName = req.deviceName,
            userAgent = request.getHeader("User-Agent"),
            ip = request.remoteAddr
        )

        val access = jwtService.createAccessToken(user.id!!, user.email)
        val refresh = refreshTokenService.issue(user, session)
        return AuthResponse(userId = user.id!!, email = user.email, accessToken = access, refreshToken = refresh)
    }

    @PostMapping("/logout")
    fun logout(@RequestBody req: RefreshRequest): Map<String, String> {
        val ok = refreshTokenService.revoke(req.refreshToken)
        if (!ok) throw IllegalArgumentException("Invalid refresh token")
        return mapOf("status" to "ok")
    }

    @PostMapping("/refresh")
    fun refresh(@RequestBody req: RefreshRequest): AuthResponse {
        // rotate returns the session + user (see next note)
        val rotated = refreshTokenService.rotateWithSession(req.refreshToken)
            ?: throw IllegalArgumentException("Invalid refresh token")

        val user = rotated.user
        val session = rotated.session

        val access = jwtService.createAccessToken(user.id!!, user.email)
        val refresh = refreshTokenService.issue(user, session)
        return AuthResponse(userId = user.id!!, email = user.email, accessToken = access, refreshToken = refresh)
    }
}
