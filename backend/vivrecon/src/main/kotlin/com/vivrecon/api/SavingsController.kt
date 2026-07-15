package com.vivrecon.api

import com.vivrecon.service.SavingsReport
import com.vivrecon.service.SavingsService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/savings")
class SavingsController(private val savingsService: SavingsService) {

    /**
     * GET /api/savings/{yearMonth}
     * Returns a savings health report for the given month:
     * - how much was saved vs income
     * - whether the user is within the 10–30% target
     * - the suggested savings amount based on their profile target
     */
    @GetMapping("/{yearMonth}")
    fun report(@PathVariable yearMonth: String): ResponseEntity<SavingsReport> =
        ResponseEntity.ok(savingsService.getSavingsReport(currentUserId(), yearMonth))
}
