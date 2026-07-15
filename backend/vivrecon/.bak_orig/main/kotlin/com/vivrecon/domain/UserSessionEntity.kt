package com.vivrecon.domain

import jakarta.persistence.*
import java.time.OffsetDateTime

@Entity
@Table(name = "user_sessions")
open class UserSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    open lateinit var user: UserEntity

    @Column(name = "device_id", nullable = false)
    open lateinit var deviceId: String

    @Column(name = "device_name")
    open var deviceName: String? = null

    @Column(name = "user_agent")
    open var userAgent: String? = null

    @Column(name = "ip")
    open var ip: String? = null

    @Column(name = "revoked_at")
    open var revokedAt: OffsetDateTime? = null

    @Column(name = "created_at", nullable = false)
    open var createdAt: OffsetDateTime = OffsetDateTime.now()

    @Column(name = "last_used_at", nullable = false)
    open var lastUsedAt: OffsetDateTime = OffsetDateTime.now()

    constructor()
}