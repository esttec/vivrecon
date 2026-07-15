package com.vivrecon.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate

// ── Weekly Meal Plan ────────────────────────────────────────────────────────

@Entity
@Table(name = "meal_plans")
data class MealPlanEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    /** Monday of the week this plan covers */
    @Column(nullable = false)
    val weekStartDate: LocalDate,

    @Column(precision = 15, scale = 2)
    var weeklyBudget: BigDecimal? = null
)

// ── Meal Plan Entry (breakfast/lunch/dinner per day) ────────────────────────

@Entity
@Table(name = "meal_plan_entries")
data class MealPlanEntryEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_plan_id", nullable = false)
    val mealPlan: MealPlanEntity,

    @Column(nullable = false)
    val dayOfWeek: Int,   // 1=Mon … 7=Sun

    @Column(nullable = false, length = 20)
    val mealType: String,  // BREAKFAST, LUNCH, DINNER, SNACK

    @Column(nullable = false)
    var description: String
)

// ── Shopping List ───────────────────────────────────────────────────────────

@Entity
@Table(name = "shopping_lists")
data class ShoppingListEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_plan_id", nullable = false)
    val mealPlan: MealPlanEntity,

    @Column(nullable = false)
    var storeName: String,

    /** best-price flag: if true, this store was selected as cheapest */
    @Column(nullable = false)
    var isCheapest: Boolean = false
)

// ── Shopping List Item ──────────────────────────────────────────────────────

@Entity
@Table(name = "shopping_list_items")
data class ShoppingListItemEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shopping_list_id", nullable = false)
    val shoppingList: ShoppingListEntity,

    @Column(nullable = false)
    var productName: String,

    @Column(nullable = false)
    var quantity: String,       // e.g. "2 kg", "1 pack"

    @Column(precision = 10, scale = 2)
    var priceEstimate: BigDecimal? = null,

    @Column(nullable = false)
    var checked: Boolean = false
)

// ── Pantry / Fridge Inventory ───────────────────────────────────────────────

@Entity
@Table(name = "pantry_items")
data class PantryItemEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var quantity: String,

    @Column(nullable = false, length = 20)
    var location: String = "PANTRY",  // FRIDGE, FREEZER, PANTRY

    @Column
    var expiryDate: LocalDate? = null
)
