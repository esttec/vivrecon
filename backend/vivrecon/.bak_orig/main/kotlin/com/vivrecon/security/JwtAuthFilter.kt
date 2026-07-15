package com.vivrecon.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val header = request.getHeader("Authorization")
        if (header != null && header.startsWith("Bearer ")) {
            val token = header.substring("Bearer ".length).trim()
            runCatching {
                val claims = jwtService.parse(token)
                val userId = claims.subject
                val email = claims["email"] as? String ?: ""

                val auth = UsernamePasswordAuthenticationToken(
                    /* principal */ userId,
                    /* credentials */ null,
                    /* authorities */ emptyList()
                ).apply {
                    details = WebAuthenticationDetailsSource().buildDetails(request)
                }

                // Store email as request attribute if you want
                request.setAttribute("email", email)

                SecurityContextHolder.getContext().authentication = auth
            }
        }

        filterChain.doFilter(request, response)
    }
}