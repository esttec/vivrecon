package com.vivrecon.domain

import jakarta.persistence.*
import java.time.OffsetDateTime

@Entity
@Table(name = "refresh_tokens")
open class RefreshTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    open lateinit var user: UserEntity

    @Column(name = "token_hash", nullable = false, unique = true)
    open lateinit var tokenHash: String

    @Column(name = "expires_at", nullable = false)
    open lateinit var expiresAt: OffsetDateTime

    @Column(name = "revoked_at")
    open var revokedAt: OffsetDateTime? = null

    @Column(name = "created_at", nullable = false)
    open var createdAt: OffsetDateTime = OffsetDateTime.now()


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    open lateinit var session: UserSessionEntity

    constructor()
}