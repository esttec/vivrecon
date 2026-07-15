package com.vivrecon.service

import com.vivrecon.domain.DebtEntity
import com.vivrecon.dto.CreateDebtRequest
import com.vivrecon.dto.DebtPaymentRequest
import com.vivrecon.dto.DebtResponse
import com.vivrecon.repo.DebtRepository
import com.vivrecon.repo.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Service
class DebtService(
    private val debtRepo: DebtRepository,
    private val userRepo: UserRepository
) {

    fun list(userId: Long): List<DebtResponse> =
        debtRepo.findAllByUserIdOrderByCreatedAtDesc(userId).map { it.toDto() }

    @Transactional
    fun create(userId: Long, req: CreateDebtRequest): DebtResponse {
        require(req.name.isNotBlank()) { "Name is required" }
        require(req.totalAmount > BigDecimal.ZERO) { "Amount must be greater than 0" }
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return debtRepo.save(
            DebtEntity(
                user = user,
                name = req.name.trim(),
                totalAmount = req.totalAmount,
                lent = req.lent,
                dueDate = req.dueDate,
                monthlyPayment = req.monthlyPayment,
                paymentDay = req.paymentDay?.coerceIn(1, 28)
            )
        ).toDto()
    }

    /** Record a payment towards a debt; never lets paid exceed the total. */
    @Transactional
    fun pay(userId: Long, id: Long, req: DebtPaymentRequest): DebtResponse {
        require(req.amount > BigDecimal.ZERO) { "Payment must be greater than 0" }
        val debt = debtRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Debt not found") }
        debt.paidAmount = (debt.paidAmount + req.amount).coerceAtMost(debt.totalAmount)
        return debtRepo.save(debt).toDto()
    }

    @Transactional
    fun delete(userId: Long, id: Long) {
        val debt = debtRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Debt not found") }
        debtRepo.delete(debt)
    }

    private fun DebtEntity.toDto(): DebtResponse {
        val remaining = (totalAmount - paidAmount).coerceAtLeast(BigDecimal.ZERO)
        val paidOff = remaining.compareTo(BigDecimal.ZERO) == 0
        return DebtResponse(
            id = id,
            name = name,
            totalAmount = totalAmount,
            paidAmount = paidAmount,
            remaining = remaining,
            paidOff = paidOff,
            lent = lent,
            dueDate = dueDate?.toString(),
            monthlyPayment = monthlyPayment,
            paymentDay = paymentDay,
            nextPaymentDate = if (paidOff) null else nextPaymentDate(paymentDay)?.toString(),
            overdue = !paidOff && dueDate?.isBefore(LocalDate.now()) == true
        )
    }

    /** The next occurrence of `day`-of-month from today (inclusive of a future day this month). */
    private fun nextPaymentDate(day: Int?): LocalDate? {
        if (day == null) return null
        val today = LocalDate.now()
        val d = day.coerceIn(1, 28)
        val thisMonth = today.withDayOfMonth(minOf(d, today.lengthOfMonth()))
        return if (thisMonth.isAfter(today)) thisMonth
               else today.plusMonths(1).let { it.withDayOfMonth(minOf(d, it.lengthOfMonth())) }
    }
}
