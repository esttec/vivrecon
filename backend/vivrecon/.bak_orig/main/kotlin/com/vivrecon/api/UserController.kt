package com.vivrecon.api

import com.vivrecon.domain.UserEntity
import com.vivrecon.repo.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

data class CreateUserRequest(val email: String, val password: String)
data class UserResponse(val id: Long, val email: String)

@RestController
@RequestMapping("/api")
class UserController(
    private val userRepository: UserRepository
) {
    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody req: CreateUserRequest): UserResponse {
        if (userRepository.existsByEmail(req.email)) {
            throw IllegalArgumentException("Email already exists")
        }

        // Temporary: DO NOT keep plain text in real auth.
        // Next step: bcrypt/argon2 hashing.
        val user = userRepository.save(
            UserEntity(
                email = req.email.lowercase().trim(),
                passwordHash = req.password
            )
        )

        return UserResponse(id = user.id!!, email = user.email)
    }
}