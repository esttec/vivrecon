package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal

@Entity
@Table(name = "profiles")
data class ProfileEntity(

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    val user: UserEntity,

    @Column(name = "display_name")
    var displayName: String? = null,

    @Column(nullable = false, length = 10)
    var currency: String = "EUR",

    @Column(name = "monthly_income", precision = 15, scale = 2)
    var monthlyIncome: BigDecimal? = null,

    @Column(name = "savings_target_percent", nullable = false, precision = 5, scale = 2)
    var savingsTargetPercent: BigDecimal = BigDecimal("20.00"),

    // ── Monthly budget planning ───────────────────────────────────────────────

    @Column(name = "rent_budget", precision = 15, scale = 2)
    var rentBudget: BigDecimal? = null,

    @Column(name = "food_budget", precision = 15, scale = 2)
    var foodBudget: BigDecimal? = null,

    @Column(name = "transport_budget", precision = 15, scale = 2)
    var transportBudget: BigDecimal? = null,

    @Column(name = "debt_payments", precision = 15, scale = 2)
    var debtPayments: BigDecimal? = null,

    @Column(name = "other_fixed_expenses", precision = 15, scale = 2)
    var otherFixedExpenses: BigDecimal? = null,

    // ── Signup location ───────────────────────────────────────────────────────

    /** Raw client IP captured at account creation (IPv4 or IPv6). */
    @Column(name = "signup_ip", length = 45)
    var signupIp: String? = null,

    /** ISO 3166-1 alpha-2 country code, resolved from signupIp later/offline. */
    @Column(name = "country", length = 2)
    var country: String? = null,

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0
)
