package com.vivrecon.service

import com.vivrecon.domain.ChildEntity
import com.vivrecon.domain.ChildExpenseEntity
import com.vivrecon.dto.*
import com.vivrecon.repo.ChildExpenseRepository
import com.vivrecon.repo.ChildRepository
import com.vivrecon.repo.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class ChildService(
    private val userRepo: UserRepository,
    private val childRepo: ChildRepository,
    private val expenseRepo: ChildExpenseRepository
) {

    /** All children with their expenses for the given month + per-child total. */
    fun list(userId: Long, yearMonth: String): List<ChildResponse> =
        childRepo.findAllByUserIdOrderByCreatedAtAsc(userId).map { child ->
            val exps = expenseRepo.findAllByChildIdAndYearMonthOrderByCreatedAtDesc(child.id, yearMonth)
            ChildResponse(
                id = child.id,
                name = child.name,
                total = exps.fold(BigDecimal.ZERO) { acc, e -> acc + e.amount },
                expenses = exps.map { ChildExpenseResponse(it.id, it.name, it.amount, it.yearMonth) }
            )
        }

    @Transactional
    fun addChild(userId: Long, name: String): ChildResponse {
        require(name.isNotBlank()) { "Name is required" }
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val child = childRepo.save(ChildEntity(user = user, name = name.trim().take(120)))
        return ChildResponse(child.id, child.name, BigDecimal.ZERO, emptyList())
    }

    @Transactional
    fun deleteChild(userId: Long, id: Long) {
        val child = childRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        childRepo.delete(child) // child_expenses removed by DB cascade
    }

    @Transactional
    fun addExpense(userId: Long, childId: Long, req: ChildExpenseRequest): ChildExpenseResponse {
        val child = childRepo.findByIdAndUserId(childId, userId).orElseThrow { NoSuchElementException("Child not found") }
        val e = expenseRepo.save(
            ChildExpenseEntity(child = child, name = req.name.take(255), amount = req.amount, yearMonth = req.yearMonth)
        )
        return ChildExpenseResponse(e.id, e.name, e.amount, e.yearMonth)
    }

    @Transactional
    fun deleteExpense(userId: Long, id: Long) {
        val e = expenseRepo.findById(id).orElseThrow { NoSuchElementException("Not found") }
        require(e.child.user.id == userId) { "Forbidden" }
        expenseRepo.delete(e)
    }
}
