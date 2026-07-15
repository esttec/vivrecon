package com.vivrecon.service

import com.vivrecon.domain.AccountEntity
import com.vivrecon.domain.AccountType
import com.vivrecon.dto.AccountResponse
import com.vivrecon.dto.CreateAccountRequest
import com.vivrecon.dto.UpdateBalanceRequest
import com.vivrecon.repo.AccountRepository
import com.vivrecon.repo.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class AccountService(
    private val accountRepo: AccountRepository,
    private val userRepo: UserRepository
) {

    fun list(userId: Long): List<AccountResponse> =
        accountRepo.findAllByUserIdOrderByCreatedAtAsc(userId).map { it.toDto() }

    @Transactional
    fun create(userId: Long, req: CreateAccountRequest): AccountResponse {
        require(req.name.isNotBlank()) { "Name is required" }
        val type = runCatching { AccountType.valueOf(req.type.uppercase()) }
            .getOrElse { throw IllegalArgumentException("Type must be CASH, BANK or INVESTMENT") }
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return accountRepo.save(
            AccountEntity(user = user, name = req.name.trim(), type = type, balance = req.balance ?: BigDecimal.ZERO)
        ).toDto()
    }

    @Transactional
    fun updateBalance(userId: Long, id: Long, req: UpdateBalanceRequest): AccountResponse {
        val account = accountRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Account not found") }
        account.balance = req.balance
        return accountRepo.save(account).toDto()
    }

    @Transactional
    fun delete(userId: Long, id: Long) {
        val account = accountRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Account not found") }
        accountRepo.delete(account)
    }

    private fun AccountEntity.toDto() = AccountResponse(id, name, type.name, balance)
}
