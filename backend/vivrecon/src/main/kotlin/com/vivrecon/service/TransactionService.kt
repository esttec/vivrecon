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
            "moe", "footwear", "kingad", "deichmann", "ecco", "lindex", "monton", "mango",
            "humana", "weekend", "sinsay", "pepco", "kappahl", "abakhan"
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
            "bauhaus", "k-rauta", "espak", "ehituse abc", "furniture", "mööbel", "ikea",
            "jysk", "decora", "jysk.ee", "home4you", "sotka", "pets24", "lemmikloom"
        ),
        ExpenseCategory.COMMUNICATION to listOf("apple.com/bill", "google *", "google one", "icloud", "dropbox", "microsoft"),
        ExpenseCategory.WORK to listOf("linkedin", "canva", "adobe", "notion", "openai", "chatgpt", "office 365", "microsoft 365"),
        ExpenseCategory.GIFTS to listOf("gift", "kingitus", "lilled", "flowers"),
        // Money moved to brokers is investing, not spending; shown under Säästud.
        ExpenseCategory.SAVINGS to listOf(
            "plus500", "pluss500", "etoro", "lightyear", "trading 212", "trading212",
            "interactive brokers", "ibkr", "degiro", "xtb", "freedom finance", "bondora", "mintos"
        )
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
    private val budgetService: BudgetService,
    private val accountRepo: AccountRepository
) {

    @Transactional
    fun import(userId: Long, req: ImportTxRequest): ImportResult {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }

        // Skip rows already imported (same date, amount, description) so re-importing a statement
        // doesn't double the budget. Counted, so two identical purchases on one day both survive.
        fun key(d: java.time.LocalDate, amt: BigDecimal, desc: String) = "$d|${amt.stripTrailingZeros().toPlainString()}|${desc.take(255)}"
        val existing = txRepo.findAllByUserIdOrderByTxDateDesc(userId)
        val already = existing
            .groupingBy { key(it.txDate, it.amount, it.description) }.eachCount().toMutableMap()

        val myShops = budgetService.shopCategories(userId) // categories the user picked earlier
        val saved = mutableListOf<TransactionEntity>()
        for (item in req.items) {
            if (item.amount.compareTo(BigDecimal.ZERO) == 0) continue
            val k = key(TxRules.parseDate(item.date), item.amount, item.description)
            val left = already[k] ?: 0
            if (left > 0) { already[k] = left - 1; continue }
            val isExpense = item.amount.signum() < 0
            val category = if (isExpense) myShops[budgetService.shopKey(item.description)] ?: TxRules.categorize(item.description) else null
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

        // Refunds: a card refund carries the shop name and the exact amount of an earlier purchase.
        // Pair them (also across months/imports) so neither inflates the budget.
        // Works in either import order: a new refund can match an old purchase and vice versa.
        val openExpenses = (saved + existing).filter { it.amount.signum() < 0 && !it.refunded }.toMutableList()
        val openCredits = (saved + existing).filter { it.amount.signum() > 0 && !it.refunded }
        for (r in openCredits.sortedBy { it.txDate }) {
            val match = openExpenses
                .filter { it.amount.negate().compareTo(r.amount) == 0 && !it.txDate.isAfter(r.txDate) }
                .filter { it.description.length >= 3 && r.description.contains(it.description, ignoreCase = true) }
                .maxByOrNull { it.txDate } ?: continue
            if (r !in saved && match !in saved) continue // pair of two old rows: nothing new to do
            openExpenses.remove(match)
            r.refunded = true; match.refunded = true
            txRepo.save(r); txRepo.save(match)
            if (match !in saved) {
                // Purchase was imported earlier and is already in that month's budget: cancel it there.
                budgetService.addLine(
                    userId, match.txDate.toString().take(7),
                    UpsertBudgetLineRequest(
                        type = BudgetLineType.EXPENSE,
                        category = match.category ?: ExpenseCategory.OTHER,
                        description = "Refund: ${match.description}".take(255),
                        amount = match.amount // negative → subtracts the original purchase
                    )
                )
            }
            if (r !in saved) {
                // Refund was imported earlier and counted as income: cancel it in its month.
                budgetService.addLine(
                    userId, r.txDate.toString().take(7),
                    UpsertBudgetLineRequest(
                        type = BudgetLineType.INCOME,
                        category = null,
                        description = "Refund matched: ${match.description}".take(255),
                        amount = r.amount.negate()
                    )
                )
            }
        }

        // One budget line per (month, category, shop), so the user sees where the money went.
        val expenses = saved.filter { it.amount.signum() < 0 && !it.refunded }
        val grouped = expenses.groupBy {
            Triple(it.txDate.toString().take(7), it.category ?: ExpenseCategory.OTHER, it.description)
        }
        for ((key, txs) in grouped) {
            val (ym, cat, shop) = key
            val sum = txs.fold(BigDecimal.ZERO) { acc, t -> acc + t.amount.abs() }
            budgetService.addLine(
                userId, ym,
                UpsertBudgetLineRequest(
                    type = BudgetLineType.EXPENSE,
                    category = cat,
                    description = (if (txs.size > 1) "$shop (${txs.size})" else shop).take(255),
                    amount = sum
                )
            )
        }

        // Income: one budget line per (month, payer), e.g. salary from the employer.
        val incomes = saved.filter { it.amount.signum() > 0 && !it.refunded }
        for ((key, txs) in incomes.groupBy { it.txDate.toString().take(7) to it.description }) {
            val (ym, payer) = key
            budgetService.addLine(
                userId, ym,
                UpsertBudgetLineRequest(
                    type = BudgetLineType.INCOME,
                    category = null,
                    description = payer.take(255),
                    amount = txs.fold(BigDecimal.ZERO) { acc, t -> acc + t.amount }
                )
            )
        }

        // Keep the user's bank account in step with the statement: + income − spending of the new rows.
        // shortcut: uses the first BANK account; add an account picker to the import when users have several banks.
        accountRepo.findAllByUserIdOrderByCreatedAtAsc(userId).firstOrNull { it.type == AccountType.BANK }?.let { acc ->
            acc.balance = acc.balance + saved.fold(BigDecimal.ZERO) { a, tx -> a + tx.amount }
            accountRepo.save(acc)
        }

        val byCategory = expenses.groupBy { it.category ?: ExpenseCategory.OTHER }
            .map { (cat, txs) ->
                CategoryTotal(cat.name, txs.fold(BigDecimal.ZERO) { a, t -> a + t.amount.abs() }, txs.size)
            }
            .sortedByDescending { it.amount }

        val expenseTotal = expenses.fold(BigDecimal.ZERO) { a, t -> a + t.amount.abs() }
        val incomeTotal = incomes.fold(BigDecimal.ZERO) { a, t -> a + t.amount }

        return ImportResult(
            imported = saved.size,
            expenseTotal = expenseTotal,
            incomeTotal = incomeTotal,
            byCategory = byCategory,
            subscriptionsDetected = detectSubscriptions(userId).size,
            lastMonth = saved.maxOfOrNull { it.txDate }?.toString()?.take(7)
        )
    }

    fun listTransactions(userId: Long): List<TransactionEntity> =
        txRepo.findAllByUserIdOrderByTxDateDesc(userId)

    fun recent(userId: Long, limit: Int): List<TxResponse> =
        listTransactions(userId).take(limit).map {
            TxResponse(it.txDate.toString(), it.description, it.amount, it.category?.name, it.refunded)
        }

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
