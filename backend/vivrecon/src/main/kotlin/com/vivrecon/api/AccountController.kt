package com.vivrecon.api

import com.vivrecon.dto.AccountResponse
import com.vivrecon.dto.CreateAccountRequest
import com.vivrecon.dto.UpdateBalanceRequest
import com.vivrecon.service.AccountService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/accounts")
class AccountController(private val accountService: AccountService) {

    @GetMapping
    fun list(): ResponseEntity<List<AccountResponse>> =
        ResponseEntity.ok(accountService.list(currentUserId()))

    @PostMapping
    fun create(@RequestBody req: CreateAccountRequest): ResponseEntity<AccountResponse> =
        ResponseEntity.ok(accountService.create(currentUserId(), req))

    @PatchMapping("/{id}/balance")
    fun updateBalance(@PathVariable id: Long, @RequestBody req: UpdateBalanceRequest): ResponseEntity<AccountResponse> =
        ResponseEntity.ok(accountService.updateBalance(currentUserId(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        accountService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}
