package com.vivrecon.service

import com.vivrecon.domain.SavingsGoalEntity
import com.vivrecon.dto.CreateSavingsGoalRequest
import com.vivrecon.dto.SavingsDepositRequest
import com.vivrecon.dto.SavingsGoalResponse
import com.vivrecon.repo.SavingsGoalRepository
import com.vivrecon.repo.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class SavingsGoalService(
    private val goalRepo: SavingsGoalRepository,
    private val userRepo: UserRepository
) {

    fun list(userId: Long): List<SavingsGoalResponse> =
        goalRepo.findAllByUserIdOrderByCreatedAtDesc(userId).map { it.toDto() }

    @Transactional
    fun create(userId: Long, req: CreateSavingsGoalRequest): SavingsGoalResponse {
        require(req.name.isNotBlank()) { "Name is required" }
        require(req.targetAmount > BigDecimal.ZERO) { "Target must be greater than 0" }
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return goalRepo.save(
            SavingsGoalEntity(user = user, name = req.name.trim(), targetAmount = req.targetAmount)
        ).toDto()
    }

    /** Add money to a goal; never lets saved exceed the target. */
    @Transactional
    fun deposit(userId: Long, id: Long, req: SavingsDepositRequest): SavingsGoalResponse {
        require(req.amount > BigDecimal.ZERO) { "Deposit must be greater than 0" }
        val goal = goalRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Savings goal not found") }
        goal.savedAmount = (goal.savedAmount + req.amount).coerceAtMost(goal.targetAmount)
        return goalRepo.save(goal).toDto()
    }

    @Transactional
    fun delete(userId: Long, id: Long) {
        val goal = goalRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Savings goal not found") }
        goalRepo.delete(goal)
    }

    private fun SavingsGoalEntity.toDto(): SavingsGoalResponse {
        val remaining = (targetAmount - savedAmount).coerceAtLeast(BigDecimal.ZERO)
        return SavingsGoalResponse(
            id = id,
            name = name,
            targetAmount = targetAmount,
            savedAmount = savedAmount,
            remaining = remaining,
            reached = remaining.compareTo(BigDecimal.ZERO) == 0
        )
    }
}
