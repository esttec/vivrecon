package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.YearMonth

enum class BudgetLineType { INCOME, EXPENSE }

enum class ExpenseCategory {
    HOUSE, EATING, RESTAURANTS, TRANSPORT, CLOTHES, ENTERTAINMENT, COMMUNICATION,
    SPORT, EDUCATION, MARKETPLACES, WORK, HEALTH, GADGETS, GIFTS, TRAVEL,
    SAVINGS, DEBTS, OTHER
}

// ── Monthly Budget ──────────────────────────────────────────────────────────

@Entity
@Table(name = "budgets", uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "year_month"])])
data class BudgetEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    /** stored as "YYYY-MM" string for simplicity */
    @Column(nullable = false, length = 7)
    val yearMonth: String,   // e.g. "2025-04"

    @Column(precision = 15, scale = 2, nullable = false)
    var totalIncome: BigDecimal = BigDecimal.ZERO,

    @Column(precision = 15, scale = 2, nullable = false)
    var totalExpenses: BigDecimal = BigDecimal.ZERO
)

// ── Budget Line Items ───────────────────────────────────────────────────────

@Entity
@Table(name = "budget_lines")
data class BudgetLineEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = false)
    val budget: BudgetEntity,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: BudgetLineType,

    @Enumerated(EnumType.STRING)
    @Column
    val category: ExpenseCategory? = null,   // null for income lines

    @Column(nullable = false)
    var description: String,

    @Column(precision = 15, scale = 2, nullable = false)
    var amount: BigDecimal
)
