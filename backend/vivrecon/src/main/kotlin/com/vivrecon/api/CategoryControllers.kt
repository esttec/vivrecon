package com.vivrecon.api

import com.vivrecon.domain.TravelStatus
import com.vivrecon.dto.*
import com.vivrecon.service.*
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET
// ══════════════════════════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/budget")
class BudgetController(private val budgetService: BudgetService) {

    /** GET /api/budget  → list all months */
    @GetMapping
    fun listAll(): ResponseEntity<List<BudgetResponse>> =
        ResponseEntity.ok(budgetService.listBudgets(currentUserId()))

    /** GET /api/budget/{yearMonth}  → get or create budget for month (e.g. 2025-04) */
    @GetMapping("/{yearMonth}")
    fun get(@PathVariable yearMonth: String): ResponseEntity<BudgetResponse> =
        ResponseEntity.ok(budgetService.getOrCreateBudget(currentUserId(), yearMonth))

    /** POST /api/budget/{yearMonth}/lines  → add income or expense line */
    @PostMapping("/{yearMonth}/lines")
    fun addLine(@PathVariable yearMonth: String, @RequestBody req: UpsertBudgetLineRequest): ResponseEntity<BudgetLineResponse> =
        ResponseEntity.ok(budgetService.addLine(currentUserId(), yearMonth, req))

    /** PUT /api/budget/lines/{lineId} */
    @PutMapping("/lines/{lineId}")
    fun updateLine(@PathVariable lineId: Long, @RequestBody req: UpsertBudgetLineRequest): ResponseEntity<BudgetLineResponse> =
        ResponseEntity.ok(budgetService.updateLine(currentUserId(), lineId, req))

    /** DELETE /api/budget/lines/{lineId} */
    @DeleteMapping("/lines/{lineId}")
    fun deleteLine(@PathVariable lineId: Long): ResponseEntity<Void> {
        budgetService.deleteLine(currentUserId(), lineId)
        return ResponseEntity.noContent().build()
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOUSE
// ══════════════════════════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/house")
class HouseController(private val houseService: HouseService) {

    @GetMapping("/{yearMonth}")
    fun list(@PathVariable yearMonth: String): ResponseEntity<List<HouseExpenseResponse>> =
        ResponseEntity.ok(houseService.list(currentUserId(), yearMonth))

    @PostMapping
    fun add(@RequestBody req: HouseExpenseRequest): ResponseEntity<HouseExpenseResponse> =
        ResponseEntity.ok(houseService.add(currentUserId(), req))

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: HouseExpenseRequest): ResponseEntity<HouseExpenseResponse> =
        ResponseEntity.ok(houseService.update(currentUserId(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        houseService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// EATING
// ══════════════════════════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/eating")
class EatingController(private val eatingService: EatingService) {

    // ── Meal Plans ──────────────────────────────────────────────────────────

    @GetMapping("/meal-plans")
    fun listMealPlans(): ResponseEntity<List<MealPlanResponse>> =
        ResponseEntity.ok(eatingService.listMealPlans(currentUserId()))

    @PostMapping("/meal-plans")
    fun createMealPlan(@RequestBody req: CreateMealPlanRequest): ResponseEntity<MealPlanResponse> =
        ResponseEntity.ok(eatingService.createMealPlan(currentUserId(), req))

    @PostMapping("/meal-plans/{planId}/entries")
    fun addEntry(@PathVariable planId: Long, @RequestBody req: MealPlanEntryRequest): ResponseEntity<MealPlanEntryResponse> =
        ResponseEntity.ok(eatingService.addMealEntry(currentUserId(), planId, req))

    @DeleteMapping("/meal-plans/{planId}")
    fun deleteMealPlan(@PathVariable planId: Long): ResponseEntity<Void> {
        eatingService.deleteMealPlan(currentUserId(), planId)
        return ResponseEntity.noContent().build()
    }

    // ── Shopping Lists ──────────────────────────────────────────────────────

    @PostMapping("/meal-plans/{planId}/shopping-lists")
    fun addShoppingList(@PathVariable planId: Long, @RequestBody req: ShoppingListRequest): ResponseEntity<ShoppingListResponse> =
        ResponseEntity.ok(eatingService.addShoppingList(currentUserId(), planId, req))

    @PatchMapping("/shopping-items/{itemId}/toggle")
    fun toggleItem(@PathVariable itemId: Long): ResponseEntity<ShoppingListItemResponse> =
        ResponseEntity.ok(eatingService.toggleItemChecked(currentUserId(), itemId))

    // ── Pantry ──────────────────────────────────────────────────────────────

    @GetMapping("/pantry")
    fun listPantry(): ResponseEntity<List<PantryItemResponse>> =
        ResponseEntity.ok(eatingService.listPantry(currentUserId()))

    @PostMapping("/pantry")
    fun addPantryItem(@RequestBody req: PantryItemRequest): ResponseEntity<PantryItemResponse> =
        ResponseEntity.ok(eatingService.addPantryItem(currentUserId(), req))

    @DeleteMapping("/pantry/{id}")
    fun deletePantryItem(@PathVariable id: Long): ResponseEntity<Void> {
        eatingService.deletePantryItem(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLOTHES
// ══════════════════════════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/clothes")
class ClothingController(private val clothingService: ClothingService) {

    @GetMapping
    fun list(@RequestParam yearMonth: String?): ResponseEntity<List<ClothingItemResponse>> =
        ResponseEntity.ok(clothingService.list(currentUserId(), yearMonth))

    @PostMapping
    fun add(@RequestBody req: ClothingItemRequest): ResponseEntity<ClothingItemResponse> =
        ResponseEntity.ok(clothingService.add(currentUserId(), req))

    @PatchMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: ClothingItemUpdateRequest): ResponseEntity<ClothingItemResponse> =
        ResponseEntity.ok(clothingService.update(currentUserId(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        clothingService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAVEL
// ══════════════════════════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/travel")
class TravelController(private val travelService: TravelService) {

    @GetMapping("/trips")
    fun listTrips(): ResponseEntity<List<TripResponse>> =
        ResponseEntity.ok(travelService.listTrips(currentUserId()))

    @PostMapping("/trips")
    fun createTrip(@RequestBody req: CreateTripRequest): ResponseEntity<TripResponse> =
        ResponseEntity.ok(travelService.createTrip(currentUserId(), req))

    @PostMapping("/trips/{tripId}/offers")
    fun addOffer(@PathVariable tripId: Long, @RequestBody req: TravelOfferRequest): ResponseEntity<TravelOfferResponse> =
        ResponseEntity.ok(travelService.addOffer(currentUserId(), tripId, req))

    @PostMapping("/trips/{tripId}/offers/{offerId}/select")
    fun selectOffer(@PathVariable tripId: Long, @PathVariable offerId: Long): ResponseEntity<TravelOfferResponse> =
        ResponseEntity.ok(travelService.selectOffer(currentUserId(), tripId, offerId))

    @PutMapping("/trips/{tripId}/hotel")
    fun selectHotel(@PathVariable tripId: Long, @RequestBody req: SelectHotelRequest): ResponseEntity<TripResponse> =
        ResponseEntity.ok(travelService.selectHotel(currentUserId(), tripId, req))

    @PatchMapping("/trips/{tripId}/status")
    fun updateStatus(@PathVariable tripId: Long, @RequestParam status: TravelStatus): ResponseEntity<TripResponse> =
        ResponseEntity.ok(travelService.updateStatus(currentUserId(), tripId, status))

    @DeleteMapping("/trips/{tripId}")
    fun deleteTrip(@PathVariable tripId: Long): ResponseEntity<Void> {
        travelService.deleteTrip(currentUserId(), tripId)
        return ResponseEntity.noContent().build()
    }
}
