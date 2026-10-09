package com.vivrecon.service

import com.vivrecon.domain.*
import com.vivrecon.dto.*
import com.vivrecon.repo.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode

@Service
class BudgetService(
    private val userRepo: UserRepository,
    private val budgetRepo: BudgetRepository,
    private val lineRepo: BudgetLineRepository,
    private val jdbc: org.springframework.jdbc.core.JdbcTemplate
) {

    /** "JARVE SELVERI (5)" / "Refund: JYSK.EE" → "jarve selveri" / "jysk.ee": the shop key used for remembered categories. */
    fun shopKey(description: String): String =
        description.removePrefix("Refund: ").replace(Regex("""\s*\(\d+\)$"""), "").trim().lowercase().take(255)

    /** Remember the user's choice so the next import files this shop the same way. */
    fun rememberShopCategory(userId: Long, description: String, category: ExpenseCategory) {
        val key = shopKey(description)
        if (key.isBlank()) return
        jdbc.update(
            """INSERT INTO merchant_categories (user_id, merchant, category) VALUES (?, ?, ?)
               ON CONFLICT (user_id, merchant) DO UPDATE SET category = EXCLUDED.category""",
            userId, key, category.name
        )
    }

    fun shopCategories(userId: Long): Map<String, ExpenseCategory> =
        jdbc.query("SELECT merchant, category FROM merchant_categories WHERE user_id = ?",
            { rs, _ -> rs.getString(1) to rs.getString(2) }, userId)
            .mapNotNull { (m, c) -> runCatching { m to ExpenseCategory.valueOf(c) }.getOrNull() }
            .toMap()

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
        // Moving an expense to another category also moves it on that category's page (they read budget lines).
        if (line.type == BudgetLineType.EXPENSE && req.category != null && req.category != line.category) {
            line.category = req.category
            rememberShopCategory(userId, line.description, req.category)
        }
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

    @Transactional
    fun applyTemplate(userId: Long, yearMonth: String, req: ApplyBudgetTemplateRequest): BudgetResponse {
        val buckets = TEMPLATES[req.template]
            ?: throw IllegalArgumentException("Unknown budget template: ${req.template}")
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val budget = budgetRepo.findByUserIdAndYearMonth(userId, yearMonth).orElseGet {
            budgetRepo.save(BudgetEntity(user = user, yearMonth = yearMonth))
        }
        // A template defines the whole month, so replace any existing lines.
        lineRepo.deleteAll(lineRepo.findAllByBudgetId(budget.id))

        val income = req.monthlyIncome.setScale(2, RoundingMode.HALF_UP)
        lineRepo.save(
            BudgetLineEntity(
                budget = budget, type = BudgetLineType.INCOME, category = null,
                description = "Monthly income", amount = income
            )
        )
        var allocated = BigDecimal.ZERO
        buckets.forEachIndexed { i, b ->
            val amount = if (i == buckets.lastIndex)
                (income - allocated).setScale(2, RoundingMode.HALF_UP)
            else
                income.multiply(BigDecimal(b.pct)).divide(BigDecimal(100)).setScale(2, RoundingMode.HALF_UP)
            allocated = allocated.add(amount)
            lineRepo.save(
                BudgetLineEntity(
                    budget = budget, type = BudgetLineType.EXPENSE, category = b.category,
                    description = b.label, amount = amount
                )
            )
        }
        recalcTotals(budget)
        return budget.toDto()
    }

    private data class TemplateBucket(val label: String, val category: ExpenseCategory, val pct: Int)
    private val TEMPLATES = mapOf(
        "FIFTY_THIRTY_TWENTY" to listOf(
            TemplateBucket("Needs (50%)", ExpenseCategory.OTHER, 50),
            TemplateBucket("Wants (30%)", ExpenseCategory.ENTERTAINMENT, 30),
            TemplateBucket("Savings (20%)", ExpenseCategory.SAVINGS, 20),
        ),
        "PAY_YOURSELF_FIRST" to listOf(
            TemplateBucket("Savings (20%)", ExpenseCategory.SAVINGS, 20),
            TemplateBucket("Living (80%)", ExpenseCategory.OTHER, 80),
        ),
    )

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Take [amount] out of the line for this shop in that month (e.g. a refund cancelling a purchase).
     * The line is deleted when it reaches zero. Returns false when no such line exists.
     */
    @Transactional
    fun reduceShopLine(userId: Long, yearMonth: String, type: BudgetLineType, shop: String, amount: java.math.BigDecimal): Boolean {
        val budget = budgetRepo.findByUserIdAndYearMonth(userId, yearMonth).orElse(null) ?: return false
        val key = shopKey(shop)
        val line = lineRepo.findAllByBudgetIdAndType(budget.id, type)
            .firstOrNull { shopKey(it.description) == key && it.amount >= amount } ?: return false
        line.amount = line.amount - amount
        if (line.amount.signum() <= 0) lineRepo.delete(line) else lineRepo.save(line)
        recalcTotals(budget)
        return true
    }

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
