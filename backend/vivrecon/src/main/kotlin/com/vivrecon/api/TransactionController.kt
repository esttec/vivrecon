package com.vivrecon.api

import com.vivrecon.dto.CreateSubscriptionRequest
import com.vivrecon.dto.ImportResult
import com.vivrecon.dto.ImportTxRequest
import com.vivrecon.dto.SubscriptionResponse
import com.vivrecon.service.SubscriptionService
import com.vivrecon.service.TransactionService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api")
class TransactionController(
    private val txService: TransactionService,
    private val subService: SubscriptionService
) {

    /** POST /api/transactions/import → categorize + save to budget, returns summary */
    @PostMapping("/transactions/import")
    fun import(@RequestBody req: ImportTxRequest): ResponseEntity<ImportResult> =
        ResponseEntity.ok(txService.import(currentUserId(), req))

    /** GET /api/subscriptions → manual + auto-detected recurring charges */
    @GetMapping("/subscriptions")
    fun subscriptions(): ResponseEntity<List<SubscriptionResponse>> =
        ResponseEntity.ok(subService.list(currentUserId()))

    /** POST /api/subscriptions → add a subscription manually */
    @PostMapping("/subscriptions")
    fun addSubscription(@RequestBody req: CreateSubscriptionRequest): ResponseEntity<SubscriptionResponse> =
        ResponseEntity.ok(subService.create(currentUserId(), req))

    /** DELETE /api/subscriptions/{id} → remove a manual subscription */
    @DeleteMapping("/subscriptions/{id}")
    fun deleteSubscription(@PathVariable id: Long): ResponseEntity<Void> {
        subService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}
