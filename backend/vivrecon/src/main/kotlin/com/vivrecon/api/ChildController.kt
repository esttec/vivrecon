package com.vivrecon.api

import com.vivrecon.dto.ChildExpenseRequest
import com.vivrecon.dto.ChildExpenseResponse
import com.vivrecon.dto.ChildResponse
import com.vivrecon.dto.CreateChildRequest
import com.vivrecon.service.ChildService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/children")
class ChildController(private val childService: ChildService) {

    private fun uid(): Long =
        SecurityContextHolder.getContext().authentication.principal.toString().toLong()

    /** GET /api/children/{yearMonth} → children + their expenses that month */
    @GetMapping("/{yearMonth}")
    fun list(@PathVariable yearMonth: String): ResponseEntity<List<ChildResponse>> =
        ResponseEntity.ok(childService.list(uid(), yearMonth))

    @PostMapping
    fun addChild(@RequestBody req: CreateChildRequest): ResponseEntity<ChildResponse> =
        ResponseEntity.ok(childService.addChild(uid(), req.name))

    @DeleteMapping("/{id}")
    fun deleteChild(@PathVariable id: Long): ResponseEntity<Void> {
        childService.deleteChild(uid(), id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{childId}/expenses")
    fun addExpense(@PathVariable childId: Long, @RequestBody req: ChildExpenseRequest): ResponseEntity<ChildExpenseResponse> =
        ResponseEntity.ok(childService.addExpense(uid(), childId, req))

    @DeleteMapping("/expenses/{id}")
    fun deleteExpense(@PathVariable id: Long): ResponseEntity<Void> {
        childService.deleteExpense(uid(), id)
        return ResponseEntity.noContent().build()
    }
}
