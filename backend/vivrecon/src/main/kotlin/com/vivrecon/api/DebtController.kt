package com.vivrecon.api

import com.vivrecon.dto.CreateDebtRequest
import com.vivrecon.dto.DebtPaymentRequest
import com.vivrecon.dto.DebtResponse
import com.vivrecon.service.DebtService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/debts")
class DebtController(private val debtService: DebtService) {

    /** Signed-in user id, read straight from the security context. */
    private fun uid(): Long =
        SecurityContextHolder.getContext().authentication.principal.toString().toLong()

    @GetMapping
    fun list(): ResponseEntity<List<DebtResponse>> =
        ResponseEntity.ok(debtService.list(uid()))

    @PostMapping
    fun create(@RequestBody req: CreateDebtRequest): ResponseEntity<DebtResponse> =
        ResponseEntity.ok(debtService.create(uid(), req))

    /** Edit an existing debt. */
    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: CreateDebtRequest): ResponseEntity<DebtResponse> =
        ResponseEntity.ok(debtService.update(uid(), id, req))

    /** Record a payment towards a debt. */
    @PostMapping("/{id}/pay")
    fun pay(@PathVariable id: Long, @RequestBody req: DebtPaymentRequest): ResponseEntity<DebtResponse> =
        ResponseEntity.ok(debtService.pay(uid(), id, req))

    /** Undo a payment entered by mistake. */
    @PostMapping("/{id}/unpay")
    fun unpay(@PathVariable id: Long, @RequestBody req: DebtPaymentRequest): ResponseEntity<DebtResponse> =
        ResponseEntity.ok(debtService.unpay(uid(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        debtService.delete(uid(), id)
        return ResponseEntity.noContent().build()
    }
}
