package com.vivrecon.dto

import com.vivrecon.domain.*
import java.math.BigDecimal
import java.time.LocalDate

// ── Debts ─────────────────────────────────────────────────────────────────────

data class CreateDebtRequest(
    val name: String,
    val totalAmount: BigDecimal,
    val lent: Boolean = false,
    val dueDate: LocalDate? = null,
    val monthlyPayment: BigDecimal? = null,
    val paymentDay: Int? = null
)
data class DebtPaymentRequest(val amount: BigDecimal)
data class DebtResponse(
    val id: Long,
    val name: String,
    val totalAmount: BigDecimal,
    val paidAmount: BigDecimal,
    val remaining: BigDecimal,
    val paidOff: Boolean,
    val lent: Boolean,
    val dueDate: String?,
    val monthlyPayment: BigDecimal?,
    val paymentDay: Int?,
    val nextPaymentDate: String?,
    val overdue: Boolean
)

// ── Accounts ──────────────────────────────────────────────────────────────────

data class CreateAccountRequest(val name: String, val type: String, val balance: BigDecimal? = null)
data class UpdateBalanceRequest(val balance: BigDecimal)
data class AccountResponse(val id: Long, val name: String, val type: String, val balance: BigDecimal)

// ── Billing (Stripe) ──────────────────────────────────────────────────────────

data class CheckoutRequest(val plan: String)          // "monthly" | "yearly"
data class CheckoutResponse(val url: String)

// ── Children ──────────────────────────────────────────────────────────────────

data class CreateChildRequest(val name: String)
data class ChildExpenseRequest(val name: String, val amount: BigDecimal, val yearMonth: String)
data class ChildExpenseResponse(val id: Long, val name: String, val amount: BigDecimal, val yearMonth: String)
data class ChildResponse(
    val id: Long,
    val name: String,
    val total: BigDecimal,
    val expenses: List<ChildExpenseResponse>
)

// ── Bank import & subscriptions ───────────────────────────────────────────────

data class ImportTxItem(val date: String, val description: String, val amount: BigDecimal)
data class ImportTxRequest(val items: List<ImportTxItem>)
data class CategoryTotal(val category: String, val amount: BigDecimal, val count: Int)
data class ImportResult(
    val imported: Int,
    val expenseTotal: BigDecimal,
    val incomeTotal: BigDecimal,
    val byCategory: List<CategoryTotal>,
    val subscriptionsDetected: Int
)
data class CreateSubscriptionRequest(
    val name: String,
    val category: String? = null,
    val amount: BigDecimal,
    val billingDay: Int? = null
)
data class SubscriptionResponse(
    val name: String,
    val category: String,
    val amount: BigDecimal,
    val billingDay: Int,
    val occurrences: Int,
    val lastDate: String,
    val id: Long? = null,
    val manual: Boolean = false
)

// ── User categories ───────────────────────────────────────────────────────────

data class CreateCategoryRequest(val name: String, val kind: String, val parentId: Long? = null)
data class CategoryResponse(val id: Long, val name: String, val kind: String, val parentId: Long?)

// ── AI assistant ──────────────────────────────────────────────────────────────

data class AiChatRequest(val message: String)
data class AiChatResponse(val reply: String)

// ── Savings goals ─────────────────────────────────────────────────────────────

data class CreateSavingsGoalRequest(val name: String, val targetAmount: BigDecimal)
data class SavingsDepositRequest(val amount: BigDecimal)
data class SavingsGoalResponse(
    val id: Long,
    val name: String,
    val targetAmount: BigDecimal,
    val savedAmount: BigDecimal,
    val remaining: BigDecimal,
    val reached: Boolean
)

// ── Auth ──────────────────────────────────────────────────────────────────────

data class RegisterRequest(val email: String, val password: String)
data class LoginRequest(val email: String, val password: String)
data class RefreshRequest(val refreshToken: String)
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val disclaimerAccepted: Boolean
)

// ── Me ────────────────────────────────────────────────────────────────────────

data class MeResponse(
    val id: Long,
    val email: String,
    val disclaimerAccepted: Boolean,
    val profile: ProfileResponse?,
    val premium: Boolean = false,
    val paid: Boolean = false,
    val trialDaysLeft: Int = 0,
    val premiumUntil: String? = null
)

data class ProfileResponse(
    val id: Long,
    val displayName: String?,
    val currency: String,
    val monthlyIncome: BigDecimal?,
    val savingsTargetPercent: BigDecimal,
    // monthly budget planning
    val rentBudget: BigDecimal?,
    val foodBudget: BigDecimal?,
    val transportBudget: BigDecimal?,
    val debtPayments: BigDecimal?,
    val otherFixedExpenses: BigDecimal?,
    // signup location
    val signupIp: String?,
    val country: String?
)

data class UpdateProfileRequest(
    val displayName: String?,
    val currency: String?,
    val monthlyIncome: BigDecimal?,
    val savingsTargetPercent: BigDecimal?,
    // monthly budget planning
    val rentBudget: BigDecimal?,
    val foodBudget: BigDecimal?,
    val transportBudget: BigDecimal?,
    val debtPayments: BigDecimal?,
    val otherFixedExpenses: BigDecimal?
)

// ── Disclaimer ────────────────────────────────────────────────────────────────

data class AcceptDisclaimerResponse(val accepted: Boolean)

// ── Sessions ──────────────────────────────────────────────────────────────────

data class SessionResponse(
    val id: Long,
    val deviceInfo: String,
    val createdAt: String,
    val lastSeenAt: String,
    val active: Boolean
)

// ── Budget ────────────────────────────────────────────────────────────────────

data class BudgetResponse(
    val id: Long,
    val yearMonth: String,
    val totalIncome: BigDecimal,
    val totalExpenses: BigDecimal,
    val balance: BigDecimal,
    val incomeLines: List<BudgetLineResponse>,
    val expenseLines: List<BudgetLineResponse>
)

data class BudgetLineResponse(
    val id: Long,
    val type: String,
    val category: String?,
    val description: String,
    val amount: BigDecimal
)

data class UpsertBudgetLineRequest(
    val type: BudgetLineType,
    val category: ExpenseCategory?,
    val description: String,
    val amount: BigDecimal
)

// ── House ─────────────────────────────────────────────────────────────────────

data class HouseExpenseRequest(
    val expenseType: HouseExpenseType,
    val name: String,
    val amount: BigDecimal,
    val yearMonth: String
)

data class HouseExpenseResponse(
    val id: Long,
    val expenseType: String,
    val name: String,
    val amount: BigDecimal,
    val yearMonth: String
)

// ── Eating ────────────────────────────────────────────────────────────────────

data class CreateMealPlanRequest(val weekStartDate: LocalDate, val weeklyBudget: BigDecimal?)

data class MealPlanResponse(
    val id: Long,
    val weekStartDate: LocalDate,
    val weeklyBudget: BigDecimal?,
    val entries: List<MealPlanEntryResponse>,
    val shoppingLists: List<ShoppingListResponse>
)

data class MealPlanEntryRequest(val dayOfWeek: Int, val mealType: String, val description: String)
data class MealPlanEntryResponse(val id: Long, val dayOfWeek: Int, val mealType: String, val description: String)

data class ShoppingListRequest(val storeName: String, val items: List<ShoppingListItemRequest>)
data class ShoppingListResponse(
    val id: Long,
    val storeName: String,
    val isCheapest: Boolean,
    val items: List<ShoppingListItemResponse>
)

data class ShoppingListItemRequest(val productName: String, val quantity: String, val priceEstimate: BigDecimal?)
data class ShoppingListItemResponse(
    val id: Long, val productName: String, val quantity: String,
    val priceEstimate: BigDecimal?, val checked: Boolean
)

data class PantryItemRequest(val name: String, val quantity: String, val location: String, val expiryDate: LocalDate?)
data class PantryItemResponse(
    val id: Long, val name: String, val quantity: String,
    val location: String, val expiryDate: LocalDate?
)

// ── Clothes ───────────────────────────────────────────────────────────────────

data class ClothingItemRequest(
    val itemName: String,
    val description: String?,
    val preferredFabric: FabricType?,
    val maxBudget: BigDecimal?,
    val yearMonth: String
)

data class ClothingItemUpdateRequest(
    val status: ClothingStatus?,
    val actualPrice: BigDecimal?,
    val storeName: String?,
    val preferredFabric: FabricType?
)

data class ClothingItemResponse(
    val id: Long,
    val itemName: String,
    val description: String?,
    val preferredFabric: String?,
    val maxBudget: BigDecimal?,
    val actualPrice: BigDecimal?,
    val storeName: String?,
    val status: String,
    val yearMonth: String
)

// ── Travel ────────────────────────────────────────────────────────────────────

data class CreateTripRequest(
    val destination: String,
    val departureFrom: String?,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val totalBudget: BigDecimal?
)

data class TripResponse(
    val id: Long,
    val destination: String,
    val departureFrom: String?,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val totalBudget: BigDecimal?,
    val status: String,
    val selectedHotel: String?,
    val hotelPricePerNight: BigDecimal?,
    val lastScannedAt: String?,
    val offers: List<TravelOfferResponse>
)

data class TravelOfferRequest(
    val offerType: OfferType,
    val provider: String,
    val title: String,
    val price: BigDecimal,
    val url: String?
)

data class TravelOfferResponse(
    val id: Long,
    val offerType: String,
    val provider: String,
    val title: String,
    val price: BigDecimal,
    val url: String?,
    val selected: Boolean,
    val scannedAt: String
)

data class SelectHotelRequest(val selectedHotel: String, val hotelPricePerNight: BigDecimal)
