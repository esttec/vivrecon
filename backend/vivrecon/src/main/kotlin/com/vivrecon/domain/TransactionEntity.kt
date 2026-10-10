package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

@Entity
@Table(name = "transactions")
data class TransactionEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(name = "tx_date", nullable = false)
    val txDate: LocalDate,

    @Column(nullable = false, length = 255)
    val description: String,

    @Column(length = 120)
    val merchant: String? = null,

    @Column(precision = 15, scale = 2, nullable = false)
    val amount: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    val category: ExpenseCategory? = null,

    /** The bank's own id for this row (archive code); unique per user, so a row is never registered twice. */
    @Column(name = "bank_ref", length = 64)
    val bankRef: String? = null,

    /** True for a purchase and its matching refund; both are left out of the budget. */
    @Column(nullable = false)
    var refunded: Boolean = false,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
