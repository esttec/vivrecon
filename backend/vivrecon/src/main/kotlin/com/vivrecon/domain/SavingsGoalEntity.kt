package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant

@Entity
@Table(name = "savings_goals")
data class SavingsGoalEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false)
    var name: String,

    @Column(name = "target_amount", precision = 15, scale = 2, nullable = false)
    var targetAmount: BigDecimal,

    @Column(name = "saved_amount", precision = 15, scale = 2, nullable = false)
    var savedAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
