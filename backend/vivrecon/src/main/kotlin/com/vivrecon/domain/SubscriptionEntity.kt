package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant

@Entity
@Table(name = "subscriptions")
data class SubscriptionEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false, length = 120)
    val name: String,

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    val category: ExpenseCategory? = null,

    @Column(precision = 15, scale = 2, nullable = false)
    val amount: BigDecimal,

    @Column(name = "billing_day", nullable = false)
    val billingDay: Int = 1,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
