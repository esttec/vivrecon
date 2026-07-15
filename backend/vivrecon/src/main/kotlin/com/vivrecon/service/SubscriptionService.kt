package com.vivrecon.service

import com.vivrecon.domain.*
import com.vivrecon.dto.*
import com.vivrecon.repo.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class SubscriptionService(
    private val userRepo: UserRepository,
    private val subRepo: SubscriptionRepository,
    private val txService: TransactionService
) {

    /** Manually-added subscriptions + auto-detected ones (dedup by name). */
    fun list(userId: Long): List<SubscriptionResponse> {
        val manual = subRepo.findAllByUserIdOrderByCreatedAtAsc(userId).map {
            SubscriptionResponse(
                name = it.name,
                category = (it.category ?: ExpenseCategory.OTHER).name,
                amount = it.amount,
                billingDay = it.billingDay,
                occurrences = 0,
                lastDate = "",
                id = it.id,
                manual = true
            )
        }
        val manualNames = manual.map { it.name.lowercase() }
        val detected = txService.detectSubscriptions(userId)
            .filter { d -> manualNames.none { it.contains(d.name.lowercase()) || d.name.lowercase().contains(it) } }

        return (manual + detected).sortedWith(
            compareByDescending<SubscriptionResponse> { it.manual }.thenByDescending { it.amount }
        )
    }

    @Transactional
    fun create(userId: Long, req: CreateSubscriptionRequest): SubscriptionResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        require(req.name.isNotBlank()) { "Name is required" }
        val category = req.category?.let { c -> runCatching { ExpenseCategory.valueOf(c) }.getOrNull() }
        val day = (req.billingDay ?: 1).coerceIn(1, 31)
        val sub = subRepo.save(
            SubscriptionEntity(
                user = user,
                name = req.name.trim().take(120),
                category = category,
                amount = req.amount.abs(),
                billingDay = day
            )
        )
        return SubscriptionResponse(
            name = sub.name,
            category = (sub.category ?: ExpenseCategory.OTHER).name,
            amount = sub.amount,
            billingDay = sub.billingDay,
            occurrences = 0,
            lastDate = "",
            id = sub.id,
            manual = true
        )
    }

    @Transactional
    fun delete(userId: Long, id: Long) {
        val sub = subRepo.findByIdAndUserId(id, userId).orElseThrow { NoSuchElementException("Not found") }
        subRepo.delete(sub)
    }
}
