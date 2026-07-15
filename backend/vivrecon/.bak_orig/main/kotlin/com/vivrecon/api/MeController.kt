package com.vivrecon.api

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class MeController {

    @GetMapping("/me")
    fun me(): Map<String, String> {
        val auth = SecurityContextHolder.getContext().authentication
        val userId = auth?.principal?.toString() ?: "unknown"
        return mapOf("userId" to userId)
    }
}