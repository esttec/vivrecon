package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant

enum class HouseExpenseType {
    RENT, FURNITURE, HOUSEHOLD, CLEANING_SUPPLIES, DECORATIONS, UTILITIES, OTHER
}

@Entity
@Table(name = "house_expenses")
data class HouseExpenseEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val expenseType: HouseExpenseType,

    @Column(nullable = false)
    var name: String,

    @Column(precision = 15, scale = 2, nullable = false)
    var amount: BigDecimal,

    /** "YYYY-MM" month this expense belongs to */
    @Column(nullable = false, length = 7)
    val yearMonth: String,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
