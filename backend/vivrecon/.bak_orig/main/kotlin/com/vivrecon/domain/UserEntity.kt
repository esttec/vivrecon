package com.vivrecon.domain

import jakarta.persistence.*
import java.time.OffsetDateTime

@Entity
@Table(name = "users")
open class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(nullable = false, unique = true)
    open lateinit var email: String

    @Column(name = "password_hash", nullable = false)
    open lateinit var passwordHash: String

    @Column(name = "is_active", nullable = false)
    open var isActive: Boolean = true

    @Column(name = "created_at", nullable = false)
    open var createdAt: OffsetDateTime = OffsetDateTime.now()

    constructor()

    constructor(email: String, passwordHash: String, isActive: Boolean = true) {
        this.email = email
        this.passwordHash = passwordHash
        this.isActive = isActive
    }
}