package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant

@Entity
@Table(name = "children")
data class ChildEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false, length = 120)
    var name: String,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)

@Entity
@Table(name = "child_expenses")
data class ChildExpenseEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    val child: ChildEntity,

    @Column(nullable = false)
    var name: String,

    @Column(precision = 15, scale = 2, nullable = false)
    var amount: BigDecimal,

    @Column(name = "year_month", nullable = false, length = 7)
    val yearMonth: String,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
