package com.vivrecon.api

import com.vivrecon.dto.CreateSavingsGoalRequest
import com.vivrecon.dto.SavingsDepositRequest
import com.vivrecon.dto.SavingsGoalResponse
import com.vivrecon.service.SavingsGoalService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/savings/goals")
class SavingsGoalController(private val savingsGoalService: SavingsGoalService) {

    @GetMapping
    fun list(): ResponseEntity<List<SavingsGoalResponse>> =
        ResponseEntity.ok(savingsGoalService.list(currentUserId()))

    @PostMapping
    fun create(@RequestBody req: CreateSavingsGoalRequest): ResponseEntity<SavingsGoalResponse> =
        ResponseEntity.ok(savingsGoalService.create(currentUserId(), req))

    /** Add money to a savings goal. */
    @PostMapping("/{id}/deposit")
    fun deposit(@PathVariable id: Long, @RequestBody req: SavingsDepositRequest): ResponseEntity<SavingsGoalResponse> =
        ResponseEntity.ok(savingsGoalService.deposit(currentUserId(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        savingsGoalService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}
