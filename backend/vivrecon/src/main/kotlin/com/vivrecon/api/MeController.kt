package com.vivrecon.api

import com.vivrecon.dto.*
import com.vivrecon.service.UserService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

fun currentUserId(): Long =
    SecurityContextHolder.getContext().authentication.principal.toString().toLong()

@RestController
@RequestMapping("/api/me")
class MeController(private val userService: UserService) {

    @GetMapping
    fun getMe(): ResponseEntity<MeResponse> =
        ResponseEntity.ok(userService.getMe(currentUserId()))

    @PostMapping("/disclaimer/accept")
    fun acceptDisclaimer(): ResponseEntity<AcceptDisclaimerResponse> =
        ResponseEntity.ok(userService.acceptDisclaimer(currentUserId()))

    @PutMapping("/profile")
    fun updateProfile(@RequestBody req: UpdateProfileRequest): ResponseEntity<ProfileResponse> =
        ResponseEntity.ok(userService.upsertProfile(currentUserId(), req))

    // Premium is granted only through a paid Stripe subscription (see BillingController).
}
