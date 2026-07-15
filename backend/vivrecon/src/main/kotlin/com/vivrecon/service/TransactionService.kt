package com.vivrecon.service

import com.vivrecon.domain.*
import com.vivrecon.dto.*
import com.vivrecon.repo.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Rules for turning free-text bank descriptions into a spending category and a
 * normalized merchant name. Everything is keyword based and locale-aware
 * (Estonian / English / common EU merchants) so it works on real statements.
 */
object TxRules {

    // Known recurring merchants — used to flag subscriptions even from a single month.
    val SUBSCRIPTION_KEYWORDS = listOf(
        "netflix", "spotify", "youtube premium", "youtube", "hbo", "max.com", "disney",
        "apple.com/bill", "apple.com", "icloud", "itunes", "google storage", "google one",
        "google *", "amazon prime", "prime video", "playstation", "xbox", "nintendo",
        "adobe", "microsoft 365", "office 365", "dropbox", "storytel", "audible",
        "patreon", "canva", "openai", "chatgpt", "notion", "linkedin", "duolingo",
        "myfitness", "gym", "elisa raamat", "go3", "viaplay", "kinnisvara",
        "telia", "elisa", "tele2"
    )

    // Category keyword rules, evaluated in order (first match wins).
    private val RULES: List<Pair<ExpenseCategory, List<String>>> = listOf(
        ExpenseCategory.ENTERTAINMENT to listOf(
            "netflix", "spotify", "youtube", "hbo", "max.com", "disney", "viaplay", "go3",
            "cinema", "kino", "apollo kino", "forum cinema", "playstation", "xbox", "steam",
            "nintendo", "twitch", "patreon", "storytel", "audible", "theatre", "teater"
        ),
        ExpenseCategory.COMMUNICATION to listOf(
            "telia", "elisa", "tele2", "internet", "mobile", "telco", "wifi", "broadband"
        ),
        ExpenseCategory.RESTAURANTS to listOf(
            "wolt", "bolt food", "boltfood", "mcdonald", "hesburger", "kfc", "burger",
            "restaurant", "restoran", "cafe", "kohvik", "pizza", "sushi", "vapiano",
            "subway", "starbucks", "coffee", "bar ", "pub", "bistro"
        ),
        ExpenseCategory.EATING to listOf(
            "rimi", "maxima", "prisma", "coop", "selver", "lidl", "konsum", "aldi",
            "grocery", "supermarket", "market", "kaubahall", "toidupood", "delice",
            "stockmann toidu", "food", "bakery", "pagar"
        ),
        ExpenseCategory.TRANSPORT to listOf(
            "bolt", "uber", "taxi", "takso", "neste", "circle k", "circlek", "olerex",
            "alexela", "shell", "terminal oil", "fuel", "kütus", "bensiin", "parking",
            "parkimine", "elron", "ridango", "ühisttransport", "bus", "rail", "train",
            "tallink", "viking line", "airbaltic parking"
        ),
        ExpenseCategory.HEALTH to listOf(
            "apteek", "pharmacy", "benu", "südameapteek", "clinic", "kliinik", "hospital",
            "haigla", "arst", "dental", "hambaravi", "optika", "medical", "confido", "qvalitas"
        ),
        ExpenseCategory.SPORT to listOf(
            "myfitness", "gym", "fitness", "sport", "spordiklubi", "decathlon", "yoga", "bassein"
        ),
        ExpenseCategory.CLOTHES to listOf(
            "h&m", "hm.com", "zara", "reserved", "bershka", "denim", "clothing", "riided",
            "moe", "footwear", "kingad", "deichmann", "ecco", "lindex", "monton", "mango"
        ),
        ExpenseCategory.GADGETS to listOf(
            "euronics", "arvutitark", "klick", "apple store", "electronics", "elektroonika",
            "1a.ee", "photopoint", "onoff"
        ),
        ExpenseCategory.MARKETPLACES to listOf(
            "amazon", "aliexpress", "ebay", "kaup24", "hansapost", "zalando", "wish",
            "temu", "asos", "etsy"
        ),
        ExpenseCategory.TRAVEL to listOf(
            "hotel", "hotell", "booking.com", "airbnb", "ryanair", "airbaltic", "wizz",
            "lufthansa", "flight", "lennujaam", "airport", "tallink hotel", "hostel", "expedia"
        ),
        ExpenseCategory.EDUCATION to listOf(
            "school", "kool", "ülikool", "university", "course", "udemy", "coursera",
            "duolingo", "book", "raamat", "rahva raamat", "apollo raamat"
        ),
        ExpenseCategory.HOUSE to listOf(
            "rent", "üür", "eesti energia", "elektrilevi", "imatra", "water", "vesi",
            "gas", "gaas", "korteriühistu", "ühistu", "utilities", "kommunaal",
            "insurance", "kindlustus", "if p&c", "ergo", "salva", "seesam", "swedbank kindlustus",
            "bauhaus", "k-rauta", "espak", "ehituse abc", "furniture", "mööbel", "ikea"
        ),
        ExpenseCategory.COMMUNICATION to listOf("apple.com/bill", "google *", "google one", "icloud", "dropbox", "microsoft"),
        ExpenseCategory.WORK to listOf("linkedin", "canva", "adobe", "notion", "openai", "chatgpt", "office 365", "microsoft 365"),
        ExpenseCategory.GIFTS to listOf("gift", "kingitus", "lilled", "flowers")
    )

    fun categorize(desc: String): ExpenseCategory {
        val d = desc.lowercase()
        for ((cat, keys) in RULES) {
            if (keys.any { d.contains(it) }) return cat
        }
        return ExpenseCategory.OTHER
    }

    fun isSubscriptionMerchant(desc: String): Boolean {
        val d = desc.lowercase()
        return SUBSCRIPTION_KEYWORDS.any { d.contains(it) }
    }

    /** Group key so the same shop across statements collapses to one merchant. */
    fun merchantKey(desc: String): String {
        val d = desc.lowercase()
        SUBSCRIPTION_KEYWORDS.firstOrNull { d.contains(it) }?.let { return it }
        val words = d.replace(Regex("[^a-zäöüõ ]"), " ").replace(Regex("\\s+"), " ").trim().split(" ")
        return words.firstOrNull { it.length >= 3 } ?: (words.firstOrNull() ?: "other")
    }

    fun displayName(key: String): String =
        key.split(" ", "-", ".").filter { it.isNotBlank() }
            .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
            .take(60)

    private val DATE_FORMATS = listOf(
        "yyyy-MM-dd", "dd.MM.yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "dd-MM-yyyy", "MM/dd/yyyy"
    ).map { DateTimeFormatter.ofPattern(it) }

    fun parseDate(s: String): LocalDate {
        val token = s.trim().split(" ", "T").firstOrNull()?.take(10) ?: s.trim().take(10)
        for (fmt in DATE_FORMATS) {
            runCatching { return LocalDate.parse(token, fmt) }
        }
        return LocalDate.now()
    }
}

@Service
class TransactionService(
    private val userRepo: UserRepository,
    private val txRepo: TransactionRepository,
    private val budgetService: BudgetService
) {

    @Transactional
    fun import(userId: Long, req: ImportTxRequest): ImportResult {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }

        val saved = mutableListOf<TransactionEntity>()
        for (item in req.items) {
            if (item.amount.compareTo(BigDecimal.ZERO) == 0) continue
            val isExpense = item.amount.signum() < 0
            val category = if (isExpense) TxRules.categorize(item.description) else null
            saved += txRepo.save(
                TransactionEntity(
                    user = user,
                    txDate = TxRules.parseDate(item.date),
                    description = item.description.take(255),
                    merchant = TxRules.merchantKey(item.description).take(120),
                    amount = item.amount,
                    category = category
                )
            )
        }

        // Aggregate this batch's expenses by (month, category) → one budget line each.
        val expenses = saved.filter { it.amount.signum() < 0 }
        val grouped = expenses.groupBy {
            it.txDate.toString().take(7) to (it.category ?: ExpenseCategory.OTHER)
        }
        for ((key, txs) in grouped) {
            val (ym, cat) = key
            val sum = txs.fold(BigDecimal.ZERO) { acc, t -> acc + t.amount.abs() }
            budgetService.addLine(
                userId, ym,
                UpsertBudgetLineRequest(
                    type = BudgetLineType.EXPENSE,
                    category = cat,
                    description = "Bank import (${txs.size})",
                    amount = sum
                )
            )
        }

        val byCategory = expenses.groupBy { it.category ?: ExpenseCategory.OTHER }
            .map { (cat, txs) ->
                CategoryTotal(cat.name, txs.fold(BigDecimal.ZERO) { a, t -> a + t.amount.abs() }, txs.size)
            }
            .sortedByDescending { it.amount }

        val expenseTotal = expenses.fold(BigDecimal.ZERO) { a, t -> a + t.amount.abs() }
        val incomeTotal = saved.filter { it.amount.signum() > 0 }.fold(BigDecimal.ZERO) { a, t -> a + t.amount }

        return ImportResult(
            imported = saved.size,
            expenseTotal = expenseTotal,
            incomeTotal = incomeTotal,
            byCategory = byCategory,
            subscriptionsDetected = detectSubscriptions(userId).size
        )
    }

    fun listTransactions(userId: Long): List<TransactionEntity> =
        txRepo.findAllByUserIdOrderByTxDateDesc(userId)

    /** Recurring charges: known subscription merchants, or any merchant seen in ≥2 months. */
    fun detectSubscriptions(userId: Long): List<SubscriptionResponse> {
        val expenses = txRepo.findAllByUserIdOrderByTxDateDesc(userId)
            .filter { it.amount.signum() < 0 && it.merchant != null }

        val out = mutableListOf<SubscriptionResponse>()
        for ((key, txs) in expenses.groupBy { it.merchant!! }) {
            val months = txs.map { it.txDate.toString().take(7) }.toSet()
            val known = TxRules.isSubscriptionMerchant(key) || txs.any { TxRules.isSubscriptionMerchant(it.description) }
            val recurring = months.size >= 2
            if (!known && !recurring) continue
            if (key.length < 3) continue

            val amounts = txs.map { it.amount.abs() }.sorted()
            val median = amounts[amounts.size / 2]
            val billingDay = txs.map { it.txDate.dayOfMonth }
                .groupingBy { it }.eachCount().maxByOrNull { it.value }?.key ?: 1
            val last = txs.maxByOrNull { it.txDate }!!.txDate
            val cat = txs.mapNotNull { it.category }.firstOrNull() ?: ExpenseCategory.OTHER

            out += SubscriptionResponse(
                name = TxRules.displayName(key),
                category = cat.name,
                amount = median,
                billingDay = billingDay,
                occurrences = txs.size,
                lastDate = last.toString()
            )
        }
        return out.sortedByDescending { it.amount }
    }
}
