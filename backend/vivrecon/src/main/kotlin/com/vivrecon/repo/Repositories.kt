package com.vivrecon.repo

import com.vivrecon.domain.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.Optional

// ── Core ─────────────────────────────────────────────────────────────────────

interface UserRepository : JpaRepository<UserEntity, Long> {
    fun findByEmail(email: String): Optional<UserEntity>
    fun existsByEmail(email: String): Boolean
    fun findByProviderAndProviderId(provider: AuthProvider, providerId: String): Optional<UserEntity>
    fun findByStripeCustomerId(stripeCustomerId: String): Optional<UserEntity>
}

interface ProfileRepository : JpaRepository<ProfileEntity, Long> {
    fun findByUserId(userId: Long): Optional<ProfileEntity>
}

interface RefreshTokenRepository : JpaRepository<RefreshTokenEntity, Long> {
    fun findByToken(token: String): Optional<RefreshTokenEntity>
    fun deleteAllByUserId(userId: Long)
    fun deleteAllByExpiresAtBefore(cutoff: Instant)
}

interface UserSessionRepository : JpaRepository<UserSessionEntity, Long> {
    fun findAllByUserIdAndActiveTrue(userId: Long): List<UserSessionEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<UserSessionEntity>
}

// ── Budget ───────────────────────────────────────────────────────────────────

interface BudgetRepository : JpaRepository<BudgetEntity, Long> {
    fun findByUserIdAndYearMonth(userId: Long, yearMonth: String): Optional<BudgetEntity>
    fun findAllByUserId(userId: Long): List<BudgetEntity>
}

interface BudgetLineRepository : JpaRepository<BudgetLineEntity, Long> {
    fun findAllByBudgetId(budgetId: Long): List<BudgetLineEntity>
    fun findAllByBudgetIdAndType(budgetId: Long, type: BudgetLineType): List<BudgetLineEntity>
}

// ── House ────────────────────────────────────────────────────────────────────

interface HouseExpenseRepository : JpaRepository<HouseExpenseEntity, Long> {
    fun findAllByUserIdAndYearMonth(userId: Long, yearMonth: String): List<HouseExpenseEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<HouseExpenseEntity>
}

// ── Eating ───────────────────────────────────────────────────────────────────

interface MealPlanRepository : JpaRepository<MealPlanEntity, Long> {
    fun findAllByUserId(userId: Long): List<MealPlanEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<MealPlanEntity>
}

interface MealPlanEntryRepository : JpaRepository<MealPlanEntryEntity, Long> {
    fun findAllByMealPlanId(mealPlanId: Long): List<MealPlanEntryEntity>
    fun deleteAllByMealPlanId(mealPlanId: Long)
}

interface ShoppingListRepository : JpaRepository<ShoppingListEntity, Long> {
    fun findAllByMealPlanId(mealPlanId: Long): List<ShoppingListEntity>
    fun deleteAllByMealPlanId(mealPlanId: Long)
}

interface ShoppingListItemRepository : JpaRepository<ShoppingListItemEntity, Long> {
    fun findAllByShoppingListId(shoppingListId: Long): List<ShoppingListItemEntity>
    fun deleteAllByShoppingListIdIn(shoppingListIds: List<Long>)
}

interface PantryItemRepository : JpaRepository<PantryItemEntity, Long> {
    fun findAllByUserId(userId: Long): List<PantryItemEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<PantryItemEntity>
}

// ── Clothes ──────────────────────────────────────────────────────────────────

interface ClothingItemRepository : JpaRepository<ClothingItemEntity, Long> {
    fun findAllByUserId(userId: Long): List<ClothingItemEntity>
    fun findAllByUserIdAndYearMonth(userId: Long, yearMonth: String): List<ClothingItemEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<ClothingItemEntity>
}

// ── Travel ───────────────────────────────────────────────────────────────────

interface TripRepository : JpaRepository<TripEntity, Long> {
    fun findAllByUserId(userId: Long): List<TripEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<TripEntity>

    @Query("SELECT t FROM TripEntity t WHERE t.user.id = :userId AND t.status = 'PLANNING'")
    fun findActiveTripsByUserId(userId: Long): List<TripEntity>
}

interface TravelOfferRepository : JpaRepository<TravelOfferEntity, Long> {
    fun findAllByTripId(tripId: Long): List<TravelOfferEntity>
    fun findAllByTripIdAndSelected(tripId: Long, selected: Boolean): List<TravelOfferEntity>
}

// ── Debts ────────────────────────────────────────────────────────────────────

interface DebtRepository : JpaRepository<DebtEntity, Long> {
    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<DebtEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<DebtEntity>
}

// ── Savings goals ────────────────────────────────────────────────────────────

interface SavingsGoalRepository : JpaRepository<SavingsGoalEntity, Long> {
    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<SavingsGoalEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<SavingsGoalEntity>
}

// ── Accounts ─────────────────────────────────────────────────────────────────

interface AccountRepository : JpaRepository<AccountEntity, Long> {
    fun findAllByUserIdOrderByCreatedAtAsc(userId: Long): List<AccountEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<AccountEntity>
}

// ── Transactions ─────────────────────────────────────────────────────────────

interface TransactionRepository : JpaRepository<TransactionEntity, Long> {
    fun findAllByUserIdOrderByTxDateDesc(userId: Long): List<TransactionEntity>
}

interface SubscriptionRepository : JpaRepository<SubscriptionEntity, Long> {
    fun findAllByUserIdOrderByCreatedAtAsc(userId: Long): List<SubscriptionEntity>
    fun findByIdAndUserId(id: Long, userId: Long): java.util.Optional<SubscriptionEntity>
}

// ── User categories ──────────────────────────────────────────────────────────

interface UserCategoryRepository : JpaRepository<UserCategoryEntity, Long> {
    fun findAllByUserIdOrderByCreatedAtAsc(userId: Long): List<UserCategoryEntity>
    fun findByIdAndUserId(id: Long, userId: Long): Optional<UserCategoryEntity>
    fun deleteAllByParentId(parentId: Long)
}
