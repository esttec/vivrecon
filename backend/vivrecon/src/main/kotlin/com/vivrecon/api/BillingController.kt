package com.vivrecon.api

import com.vivrecon.dto.CheckoutRequest
import com.vivrecon.dto.CheckoutResponse
import com.vivrecon.service.BillingService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/billing")
class BillingController(private val billingService: BillingService) {

    private val log = LoggerFactory.getLogger(BillingController::class.java)

    /** POST /api/billing/checkout {plan} → Stripe Checkout URL to redirect to */
    @PostMapping("/checkout")
    fun checkout(@RequestBody req: CheckoutRequest): ResponseEntity<CheckoutResponse> =
        ResponseEntity.ok(billingService.createCheckout(currentUserId(), req.plan))

    /** POST /api/billing/webhook — Stripe calls this (no auth; signature-verified). */
    @PostMapping("/webhook")
    fun webhook(
        @RequestBody payload: String,
        @RequestHeader("Stripe-Signature", required = false) signature: String?
    ): ResponseEntity<String> =
        try {
            billingService.handleWebhook(payload, signature)
            ResponseEntity.ok("ok")
        } catch (e: Exception) {
            log.warn("Stripe webhook rejected: ${e.message}")
            ResponseEntity.badRequest().body("invalid")
        }
}
