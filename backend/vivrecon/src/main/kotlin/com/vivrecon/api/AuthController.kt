package com.vivrecon.api

import com.vivrecon.dto.*
import com.vivrecon.service.AuthService
import com.vivrecon.service.OAuthService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val oAuthService: OAuthService
) {

    // ── Email / Password ──────────────────────────────────────────────────────

    @PostMapping("/register")
    fun register(@RequestBody req: RegisterRequest, httpReq: HttpServletRequest): ResponseEntity<AuthResponse> {
        val device = httpReq.getHeader("User-Agent") ?: "unknown"
        return ResponseEntity.ok(authService.register(req, device, clientIp(httpReq)))
    }

    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest, httpReq: HttpServletRequest): ResponseEntity<AuthResponse> {
        val device = httpReq.getHeader("User-Agent") ?: "unknown"
        return ResponseEntity.ok(authService.login(req, device))
    }

    @PostMapping("/refresh")
    fun refresh(@RequestBody req: RefreshRequest): ResponseEntity<AuthResponse> =
        ResponseEntity.ok(authService.refresh(req))

    @PostMapping("/logout")
    fun logout(): ResponseEntity<Void> {
        authService.logout(currentUserId())
        return ResponseEntity.noContent().build()
    }

    // ── Social Auth ───────────────────────────────────────────────────────────

    /**
     * POST /api/auth/social/google
     * Body: { "idToken": "<Google ID token from mobile SDK>" }
     */
    @PostMapping("/social/google")
    fun googleAuth(
        @RequestBody req: GoogleAuthRequest,
        httpReq: HttpServletRequest
    ): ResponseEntity<AuthResponse> {
        val device = httpReq.getHeader("User-Agent") ?: "unknown"
        return ResponseEntity.ok(oAuthService.loginWithGoogle(req.idToken, device, clientIp(httpReq)))
    }

    /**
     * POST /api/auth/social/apple
     * Body: { "identityToken": "<Apple identity token>", "fullName": "John Doe" (first login only) }
     */
    @PostMapping("/social/apple")
    fun appleAuth(
        @RequestBody req: AppleAuthRequest,
        httpReq: HttpServletRequest
    ): ResponseEntity<AuthResponse> {
        val device = httpReq.getHeader("User-Agent") ?: "unknown"
        return ResponseEntity.ok(oAuthService.loginWithApple(req.identityToken, req.fullName, device, clientIp(httpReq)))
    }

    /**
     * POST /api/auth/social/facebook
     * Body: { "accessToken": "<Facebook access token from mobile SDK>" }
     */
    @PostMapping("/social/facebook")
    fun facebookAuth(
        @RequestBody req: FacebookAuthRequest,
        httpReq: HttpServletRequest
    ): ResponseEntity<AuthResponse> {
        val device = httpReq.getHeader("User-Agent") ?: "unknown"
        return ResponseEntity.ok(oAuthService.loginWithFacebook(req.accessToken, device, clientIp(httpReq)))
    }

    /**
     * Best-effort client IP. Honours the first hop in X-Forwarded-For (set by a
     * reverse proxy / load balancer) and falls back to the socket remote address.
     */
    private fun clientIp(req: HttpServletRequest): String {
        val forwarded = req.getHeader("X-Forwarded-For")
        if (!forwarded.isNullOrBlank()) {
            return forwarded.split(",").first().trim()
        }
        return req.remoteAddr ?: "unknown"
    }
}
