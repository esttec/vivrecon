package com.vivrecon.service

import com.vivrecon.domain.BudgetLineType
import com.vivrecon.domain.ExpenseCategory
import com.vivrecon.dto.BudgetLineResponse
import com.vivrecon.repo.BudgetLineRepository
import com.vivrecon.repo.BudgetRepository
import com.vivrecon.repo.ProfileRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode

data class SavingsReport(
    val yearMonth: String,
    val monthlyIncome: BigDecimal,
    val totalExpenses: BigDecimal,
    val savingsAmount: BigDecimal,
    val savingsPercent: BigDecimal,
    val targetPercent: BigDecimal,
    val onTrack: Boolean,
    val suggestedSavings: BigDecimal,
    val savingsLines: List<BudgetLineResponse>
)

@Service
class SavingsService(
    private val budgetRepo: BudgetRepository,
    private val lineRepo: BudgetLineRepository,
    private val profileRepo: ProfileRepository
) {
    fun getSavingsReport(userId: Long, yearMonth: String): SavingsReport {
        val budget = budgetRepo.findByUserIdAndYearMonth(userId, yearMonth)
            .orElseThrow { NoSuchElementException("No budget for $yearMonth") }

        val profile = profileRepo.findByUserId(userId).orElse(null)
        val targetPercent = profile?.savingsTargetPercent ?: BigDecimal("20.00")

        val allLines = lineRepo.findAllByBudgetId(budget.id)

        // Savings lines are expense lines explicitly tagged as SAVINGS
        val savingsLines = allLines.filter {
            it.type == BudgetLineType.EXPENSE && it.category == ExpenseCategory.SAVINGS
        }
        val savingsAmount = savingsLines.fold(BigDecimal.ZERO) { acc, l -> acc + l.amount }

        val income = budget.totalIncome
        val savingsPercent = if (income > BigDecimal.ZERO)
            savingsAmount.divide(income, 4, RoundingMode.HALF_UP).multiply(BigDecimal("100"))
        else BigDecimal.ZERO

        val suggestedSavings = income.multiply(targetPercent).divide(BigDecimal("100"), 2, RoundingMode.HALF_UP)

        val onTrack = savingsPercent >= targetPercent

        return SavingsReport(
            yearMonth = yearMonth,
            monthlyIncome = income,
            totalExpenses = budget.totalExpenses,
            savingsAmount = savingsAmount,
            savingsPercent = savingsPercent.setScale(2, RoundingMode.HALF_UP),
            targetPercent = targetPercent,
            onTrack = onTrack,
            suggestedSavings = suggestedSavings,
            savingsLines = savingsLines.map {
                BudgetLineResponse(it.id, it.type.name, it.category?.name, it.description, it.amount)
            }
        )
    }
}
