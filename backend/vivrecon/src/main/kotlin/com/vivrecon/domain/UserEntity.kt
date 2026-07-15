package com.vivrecon.domain

import jakarta.persistence.*
import java.time.Instant

enum class AuthProvider { LOCAL, GOOGLE, APPLE, FACEBOOK }

@Entity
@Table(
    name = "users",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_users_email", columnNames = ["email"]),
        UniqueConstraint(name = "uk_users_provider", columnNames = ["provider", "provider_id"])
    ]
)
data class UserEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false)
    val email: String,

    /**
     * Null for social-only accounts (Google / Apple / Facebook).
     * Present for LOCAL accounts.
     */
    @Column
    val passwordHash: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val provider: AuthProvider = AuthProvider.LOCAL,

    /**
     * The unique ID returned by the OAuth provider (sub / user-id).
     * Null for LOCAL accounts.
     */
    @Column(name = "provider_id")
    val providerId: String? = null,

    /** Full name as returned by the provider */
    @Column
    var displayName: String? = null,

    @Column
    var avatarUrl: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var disclaimerAccepted: Boolean = false,

    @Column
    var disclaimerAcceptedAt: Instant? = null,

    /** Paid premium valid until this instant (null = never subscribed). */
    @Column(name = "premium_until")
    var premiumUntil: Instant? = null,

    @Column(name = "stripe_customer_id", length = 64)
    var stripeCustomerId: String? = null,

    @Column(name = "stripe_subscription_id", length = 64)
    var stripeSubscriptionId: String? = null
)
