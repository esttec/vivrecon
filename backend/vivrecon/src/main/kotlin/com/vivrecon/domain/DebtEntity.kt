package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

@Entity
@Table(name = "debts")
data class DebtEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false)
    var name: String,

    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    var totalAmount: BigDecimal,

    @Column(name = "paid_amount", precision = 15, scale = 2, nullable = false)
    var paidAmount: BigDecimal = BigDecimal.ZERO,

    /** false = I owe this debt; true = I lent it to someone (they owe me). */
    @Column(nullable = false)
    var lent: Boolean = false,

    /** Deadline to have the debt paid off. */
    @Column(name = "due_date")
    var dueDate: LocalDate? = null,

    /** Optional recurring monthly payment amount. */
    @Column(name = "monthly_payment", precision = 15, scale = 2)
    var monthlyPayment: BigDecimal? = null,

    /** Day of month (1–28) the scheduled payment is due. */
    @Column(name = "payment_day")
    var paymentDay: Int? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
