package com.vivrecon.api

import com.vivrecon.dto.CreateDebtRequest
import com.vivrecon.dto.DebtPaymentRequest
import com.vivrecon.dto.DebtResponse
import com.vivrecon.service.DebtService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/debts")
class DebtController(private val debtService: DebtService) {

    @GetMapping
    fun list(): ResponseEntity<List<DebtResponse>> =
        ResponseEntity.ok(debtService.list(currentUserId()))

    @PostMapping
    fun create(@RequestBody req: CreateDebtRequest): ResponseEntity<DebtResponse> =
        ResponseEntity.ok(debtService.create(currentUserId(), req))

    /** Record a payment towards a debt. */
    @PostMapping("/{id}/pay")
    fun pay(@PathVariable id: Long, @RequestBody req: DebtPaymentRequest): ResponseEntity<DebtResponse> =
        ResponseEntity.ok(debtService.pay(currentUserId(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        debtService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}
