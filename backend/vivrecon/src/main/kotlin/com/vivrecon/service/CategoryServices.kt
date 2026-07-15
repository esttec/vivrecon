package com.vivrecon.service

import com.vivrecon.domain.*
import com.vivrecon.dto.*
import com.vivrecon.repo.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

// ══════════════════════════════════════════════════════════════════════════════
// HOUSE
// ══════════════════════════════════════════════════════════════════════════════

@Service
class HouseService(
    private val userRepo: UserRepository,
    private val houseRepo: HouseExpenseRepository
) {
    fun list(userId: Long, yearMonth: String): List<HouseExpenseResponse> =
        houseRepo.findAllByUserIdAndYearMonth(userId, yearMonth).map { it.toDto() }

    @Transactional
    fun add(userId: Long, req: HouseExpenseRequest): HouseExpenseResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return houseRepo.save(
            HouseExpenseEntity(user = user, expenseType = req.expenseType, name = req.name,
                amount = req.amount, yearMonth = req.yearMonth)
        ).toDto()
    }

    @Transactional
    fun update(userId: Long, id: Long, req: HouseExpenseRequest): HouseExpenseResponse {
        val item = houseRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        item.name = req.name; item.amount = req.amount
        return houseRepo.save(item).toDto()
    }

    @Transactional
    fun delete(userId: Long, id: Long) {
        val item = houseRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        houseRepo.delete(item)
    }

    private fun HouseExpenseEntity.toDto() =
        HouseExpenseResponse(id, expenseType.name, name, amount, yearMonth)
}

// ══════════════════════════════════════════════════════════════════════════════
// EATING
// ══════════════════════════════════════════════════════════════════════════════

@Service
class EatingService(
    private val userRepo: UserRepository,
    private val mealPlanRepo: MealPlanRepository,
    private val entryRepo: MealPlanEntryRepository,
    private val shoppingListRepo: ShoppingListRepository,
    private val shoppingItemRepo: ShoppingListItemRepository,
    private val pantryRepo: PantryItemRepository
) {
    // ── Meal Plans ─────────────────────────────────────────────────────────

    fun listMealPlans(userId: Long): List<MealPlanResponse> =
        mealPlanRepo.findAllByUserId(userId).map { it.toDto() }

    @Transactional
    fun createMealPlan(userId: Long, req: CreateMealPlanRequest): MealPlanResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val plan = mealPlanRepo.save(MealPlanEntity(user = user, weekStartDate = req.weekStartDate, weeklyBudget = req.weeklyBudget))
        return plan.toDto()
    }

    @Transactional
    fun addMealEntry(userId: Long, planId: Long, req: MealPlanEntryRequest): MealPlanEntryResponse {
        val plan = mealPlanRepo.findByIdAndUserId(planId, userId).orElseThrow { NoSuchElementException("Plan not found") }
        val entry = entryRepo.save(MealPlanEntryEntity(mealPlan = plan, dayOfWeek = req.dayOfWeek, mealType = req.mealType, description = req.description))
        return MealPlanEntryResponse(entry.id, entry.dayOfWeek, entry.mealType, entry.description)
    }

    /** Delete a meal plan together with its entries and shopping lists.
     *  Uses ordered bulk deletes (children first) so foreign keys stay valid. */
    @Transactional
    fun deleteMealPlan(userId: Long, planId: Long) {
        val plan = mealPlanRepo.findByIdAndUserId(planId, userId).orElseThrow { NoSuchElementException("Plan not found") }
        val listIds = shoppingListRepo.findAllByMealPlanId(planId).map { it.id }
        if (listIds.isNotEmpty()) shoppingItemRepo.deleteAllByShoppingListIdIn(listIds)
        shoppingListRepo.deleteAllByMealPlanId(planId)
        entryRepo.deleteAllByMealPlanId(planId)
        mealPlanRepo.delete(plan)
    }

    @Transactional
    fun addShoppingList(userId: Long, planId: Long, req: ShoppingListRequest): ShoppingListResponse {
        val plan = mealPlanRepo.findByIdAndUserId(planId, userId).orElseThrow { NoSuchElementException("Plan not found") }
        val list = shoppingListRepo.save(ShoppingListEntity(mealPlan = plan, storeName = req.storeName))
        val items = req.items.map {
            shoppingItemRepo.save(ShoppingListItemEntity(shoppingList = list, productName = it.productName,
                quantity = it.quantity, priceEstimate = it.priceEstimate))
        }
        // auto-select cheapest list based on total price
        markCheapest(planId)
        return list.toDto(items)
    }

    @Transactional
    fun toggleItemChecked(userId: Long, itemId: Long): ShoppingListItemResponse {
        val item = shoppingItemRepo.findById(itemId).orElseThrow { NoSuchElementException("Item not found") }
        require(item.shoppingList.mealPlan.user.id == userId) { "Forbidden" }
        item.checked = !item.checked
        return shoppingItemRepo.save(item).toDto()
    }

    // ── Pantry ─────────────────────────────────────────────────────────────

    fun listPantry(userId: Long): List<PantryItemResponse> =
        pantryRepo.findAllByUserId(userId).map { it.toDto() }

    @Transactional
    fun addPantryItem(userId: Long, req: PantryItemRequest): PantryItemResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return pantryRepo.save(PantryItemEntity(user = user, name = req.name, quantity = req.quantity,
            location = req.location, expiryDate = req.expiryDate)).toDto()
    }

    @Transactional
    fun deletePantryItem(userId: Long, id: Long) {
        val item = pantryRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        pantryRepo.delete(item)
    }

    // ── private helpers ────────────────────────────────────────────────────

    private fun markCheapest(planId: Long) {
        val lists = shoppingListRepo.findAllByMealPlanId(planId)
        if (lists.isEmpty()) return
        val totals = lists.associateWith { list ->
            shoppingItemRepo.findAllByShoppingListId(list.id).mapNotNull { it.priceEstimate }.fold(java.math.BigDecimal.ZERO) { a, b -> a + b }
        }
        val cheapest = totals.minByOrNull { it.value }?.key
        lists.forEach { it.isCheapest = (it == cheapest); shoppingListRepo.save(it) }
    }

    private fun MealPlanEntity.toDto(): MealPlanResponse {
        val entries = entryRepo.findAllByMealPlanId(id).map { MealPlanEntryResponse(it.id, it.dayOfWeek, it.mealType, it.description) }
        val lists = shoppingListRepo.findAllByMealPlanId(id).map { sl ->
            sl.toDto(shoppingItemRepo.findAllByShoppingListId(sl.id))
        }
        return MealPlanResponse(id, weekStartDate, weeklyBudget, entries, lists)
    }

    private fun ShoppingListEntity.toDto(items: List<ShoppingListItemEntity>) =
        ShoppingListResponse(id, storeName, isCheapest, items.map { it.toDto() })

    private fun ShoppingListItemEntity.toDto() =
        ShoppingListItemResponse(id, productName, quantity, priceEstimate, checked)

    private fun PantryItemEntity.toDto() =
        PantryItemResponse(id, name, quantity, location, expiryDate)
}

// ══════════════════════════════════════════════════════════════════════════════
// CLOTHES
// ══════════════════════════════════════════════════════════════════════════════

@Service
class ClothingService(
    private val userRepo: UserRepository,
    private val clothingRepo: ClothingItemRepository
) {
    fun list(userId: Long, yearMonth: String?): List<ClothingItemResponse> =
        if (yearMonth != null) clothingRepo.findAllByUserIdAndYearMonth(userId, yearMonth).map { it.toDto() }
        else clothingRepo.findAllByUserId(userId).map { it.toDto() }

    @Transactional
    fun add(userId: Long, req: ClothingItemRequest): ClothingItemResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return clothingRepo.save(ClothingItemEntity(user = user, itemName = req.itemName,
            description = req.description, preferredFabric = req.preferredFabric,
            maxBudget = req.maxBudget, yearMonth = req.yearMonth)).toDto()
    }

    @Transactional
    fun update(userId: Long, id: Long, req: ClothingItemUpdateRequest): ClothingItemResponse {
        val item = clothingRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        req.status?.let { item.status = it }
        req.actualPrice?.let { item.actualPrice = it }
        req.storeName?.let { item.storeName = it }
        req.preferredFabric?.let { item.preferredFabric = it }
        return clothingRepo.save(item).toDto()
    }

    @Transactional
    fun delete(userId: Long, id: Long) {
        val item = clothingRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        clothingRepo.delete(item)
    }

    private fun ClothingItemEntity.toDto() = ClothingItemResponse(
        id, itemName, description, preferredFabric?.name, maxBudget, actualPrice, storeName, status.name, yearMonth
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAVEL
// ══════════════════════════════════════════════════════════════════════════════

@Service
class TravelService(
    private val userRepo: UserRepository,
    private val tripRepo: TripRepository,
    private val offerRepo: TravelOfferRepository
) {
    fun listTrips(userId: Long): List<TripResponse> =
        tripRepo.findAllByUserId(userId).map { it.toDto() }

    @Transactional
    fun createTrip(userId: Long, req: CreateTripRequest): TripResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return tripRepo.save(TripEntity(user = user, destination = req.destination,
            departureFrom = req.departureFrom, startDate = req.startDate,
            endDate = req.endDate, totalBudget = req.totalBudget)).toDto()
    }

    @Transactional
    fun addOffer(userId: Long, tripId: Long, req: TravelOfferRequest): TravelOfferResponse {
        val trip = tripRepo.findByIdAndUserId(tripId, userId).orElseThrow { NoSuchElementException("Trip not found") }
        trip.lastScannedAt = Instant.now()
        tripRepo.save(trip)
        return offerRepo.save(TravelOfferEntity(trip = trip, offerType = req.offerType,
            provider = req.provider, title = req.title, price = req.price, url = req.url)).toDto()
    }

    @Transactional
    fun selectOffer(userId: Long, tripId: Long, offerId: Long): TravelOfferResponse {
        val trip = tripRepo.findByIdAndUserId(tripId, userId).orElseThrow { NoSuchElementException("Trip not found") }
        // deselect all same-type offers, then select this one
        val offer = offerRepo.findById(offerId).orElseThrow { NoSuchElementException("Offer not found") }
        offerRepo.findAllByTripId(tripId)
            .filter { it.offerType == offer.offerType }
            .forEach { it.selected = false; offerRepo.save(it) }
        offer.selected = true
        return offerRepo.save(offer).toDto()
    }

    @Transactional
    fun selectHotel(userId: Long, tripId: Long, req: SelectHotelRequest): TripResponse {
        val trip = tripRepo.findByIdAndUserId(tripId, userId).orElseThrow { NoSuchElementException("Trip not found") }
        trip.selectedHotel = req.selectedHotel
        trip.hotelPricePerNight = req.hotelPricePerNight
        return tripRepo.save(trip).toDto()
    }

    @Transactional
    fun updateStatus(userId: Long, tripId: Long, status: TravelStatus): TripResponse {
        val trip = tripRepo.findByIdAndUserId(tripId, userId).orElseThrow { NoSuchElementException("Trip not found") }
        trip.status = status
        return tripRepo.save(trip).toDto()
    }

    @Transactional
    fun deleteTrip(userId: Long, tripId: Long) {
        val trip = tripRepo.findByIdAndUserId(tripId, userId).orElseThrow { NoSuchElementException("Trip not found") }
        tripRepo.delete(trip)
    }

    private fun TripEntity.toDto() = TripResponse(
        id = id, destination = destination, departureFrom = departureFrom,
        startDate = startDate, endDate = endDate, totalBudget = totalBudget,
        status = status.name, selectedHotel = selectedHotel,
        hotelPricePerNight = hotelPricePerNight,
        lastScannedAt = lastScannedAt?.toString(),
        offers = offerRepo.findAllByTripId(id).map { it.toDto() }
    )

    private fun TravelOfferEntity.toDto() = TravelOfferResponse(
        id, offerType.name, provider, title, price, url, selected, scannedAt.toString()
    )
}
