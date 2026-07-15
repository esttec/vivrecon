package com.vivrecon.service

import com.vivrecon.domain.*
import com.vivrecon.dto.*
import com.vivrecon.repo.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class BudgetService(
    private val userRepo: UserRepository,
    private val budgetRepo: BudgetRepository,
    private val lineRepo: BudgetLineRepository
) {

    fun getBudget(userId: Long, yearMonth: String): BudgetResponse {
        val budget = budgetRepo.findByUserIdAndYearMonth(userId, yearMonth)
            .orElseThrow { NoSuchElementException("No budget for $yearMonth") }
        return budget.toDto()
    }

    fun listBudgets(userId: Long): List<BudgetResponse> =
        budgetRepo.findAllByUserId(userId).map { it.toDto() }

    @Transactional
    fun getOrCreateBudget(userId: Long, yearMonth: String): BudgetResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val budget = budgetRepo.findByUserIdAndYearMonth(userId, yearMonth).orElseGet {
            budgetRepo.save(BudgetEntity(user = user, yearMonth = yearMonth))
        }
        return budget.toDto()
    }

    @Transactional
    fun addLine(userId: Long, yearMonth: String, req: UpsertBudgetLineRequest): BudgetLineResponse {
        // Auto-create the budget row if it doesn't exist (e.g. direct API call without prior GET)
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val budget = budgetRepo.findByUserIdAndYearMonth(userId, yearMonth).orElseGet {
            budgetRepo.save(BudgetEntity(user = user, yearMonth = yearMonth))
        }
        val line = lineRepo.save(
            BudgetLineEntity(
                budget = budget,
                type = req.type,
                category = req.category,
                description = req.description,
                amount = req.amount
            )
        )
        recalcTotals(budget)
        return line.toDto()
    }

    @Transactional
    fun updateLine(userId: Long, lineId: Long, req: UpsertBudgetLineRequest): BudgetLineResponse {
        val line = lineRepo.findById(lineId).orElseThrow { NoSuchElementException("Line not found") }
        require(line.budget.user.id == userId) { "Forbidden" }
        line.description = req.description
        line.amount = req.amount
        lineRepo.save(line)
        recalcTotals(line.budget)
        return line.toDto()
    }

    @Transactional
    fun deleteLine(userId: Long, lineId: Long) {
        val line = lineRepo.findById(lineId).orElseThrow { NoSuchElementException("Line not found") }
        require(line.budget.user.id == userId) { "Forbidden" }
        val budget = line.budget
        lineRepo.delete(line)
        recalcTotals(budget)
    }

    // ── private helpers ───────────────────────────────────────────────────────

    private fun recalcTotals(budget: BudgetEntity) {
        val lines = lineRepo.findAllByBudgetId(budget.id)
        budget.totalIncome = lines.filter { it.type == BudgetLineType.INCOME }.fold(java.math.BigDecimal.ZERO) { acc, l -> acc + l.amount }
        budget.totalExpenses = lines.filter { it.type == BudgetLineType.EXPENSE }.fold(java.math.BigDecimal.ZERO) { acc, l -> acc + l.amount }
        budgetRepo.save(budget)
    }

    private fun BudgetEntity.toDto(): BudgetResponse {
        val lines = lineRepo.findAllByBudgetId(id)
        return BudgetResponse(
            id = id,
            yearMonth = yearMonth,
            totalIncome = totalIncome,
            totalExpenses = totalExpenses,
            balance = totalIncome - totalExpenses,
            incomeLines = lines.filter { it.type == BudgetLineType.INCOME }.map { it.toDto() },
            expenseLines = lines.filter { it.type == BudgetLineType.EXPENSE }.map { it.toDto() }
        )
    }

    private fun BudgetLineEntity.toDto() = BudgetLineResponse(
        id = id, type = type.name, category = category?.name,
        description = description, amount = amount
    )
}
