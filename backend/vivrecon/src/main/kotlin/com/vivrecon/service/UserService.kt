package com.vivrecon.service

import com.vivrecon.domain.ProfileEntity
import com.vivrecon.dto.*
import com.vivrecon.repo.ProfileRepository
import com.vivrecon.repo.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

private const val TRIAL_DAYS = 15L

@Service
class UserService(
    private val userRepo: UserRepository,
    private val profileRepo: ProfileRepository
) {
    fun getMe(userId: Long): MeResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val profile = profileRepo.findByUserId(userId).orElse(null)

        // 15-day free trial from signup, plus paid premium if subscribed.
        val now = Instant.now()
        val trialEnds = user.createdAt.plus(TRIAL_DAYS, ChronoUnit.DAYS)
        val secondsLeft = Duration.between(now, trialEnds).seconds
        val trialDaysLeft = if (secondsLeft <= 0) 0 else ((secondsLeft + 86_399) / 86_400).toInt()
        val paid = user.premiumUntil?.isAfter(now) == true

        return MeResponse(
            id = user.id,
            email = user.email,
            disclaimerAccepted = user.disclaimerAccepted,
            profile = profile?.toDto(),
            premium = paid || trialDaysLeft > 0,
            paid = paid,
            trialDaysLeft = trialDaysLeft,
            premiumUntil = if (paid) user.premiumUntil?.let {
                java.time.LocalDate.ofInstant(it, java.time.ZoneOffset.UTC).toString()
            } else null
        )
    }

    /** Activate premium. Billing is not wired yet — this simply grants access;
     *  plug a payment check in here before granting when you add real billing. */
    @Transactional
    fun activatePremium(userId: Long): MeResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        user.premiumUntil = Instant.now().plus(365, ChronoUnit.DAYS)
        userRepo.save(user)
        return getMe(userId)
    }

    @Transactional
    fun acceptDisclaimer(userId: Long): AcceptDisclaimerResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        if (!user.disclaimerAccepted) {
            userRepo.save(user.copy(disclaimerAccepted = true, disclaimerAcceptedAt = Instant.now()))
        }
        return AcceptDisclaimerResponse(accepted = true)
    }

    @Transactional
    fun upsertProfile(userId: Long, req: UpdateProfileRequest): ProfileResponse {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        val existing = profileRepo.findByUserId(userId).orElse(null)

        val saved = if (existing == null) {
            profileRepo.save(
                ProfileEntity(
                    user                 = user,
                    displayName          = req.displayName,
                    currency             = req.currency ?: "EUR",
                    monthlyIncome        = req.monthlyIncome,
                    savingsTargetPercent = req.savingsTargetPercent ?: BigDecimal("20.00"),
                    rentBudget           = req.rentBudget,
                    foodBudget           = req.foodBudget,
                    transportBudget      = req.transportBudget,
                    debtPayments         = req.debtPayments,
                    otherFixedExpenses   = req.otherFixedExpenses
                )
            )
        } else {
            // Always apply every field that was sent — frontend sends the full desired state
            existing.displayName          = req.displayName
            existing.currency             = req.currency             ?: existing.currency
            existing.monthlyIncome        = req.monthlyIncome
            existing.savingsTargetPercent = req.savingsTargetPercent ?: existing.savingsTargetPercent
            existing.rentBudget           = req.rentBudget
            existing.foodBudget           = req.foodBudget
            existing.transportBudget      = req.transportBudget
            existing.debtPayments         = req.debtPayments
            existing.otherFixedExpenses   = req.otherFixedExpenses
            profileRepo.save(existing)
        }

        return saved.toDto()
    }

    // ── mapper ───────────────────────────────────────────────────────────────

    private fun ProfileEntity.toDto() = ProfileResponse(
        id                   = id,
        displayName          = displayName,
        currency             = currency,
        monthlyIncome        = monthlyIncome,
        savingsTargetPercent = savingsTargetPercent,
        rentBudget           = rentBudget,
        foodBudget           = foodBudget,
        transportBudget      = transportBudget,
        debtPayments         = debtPayments,
        otherFixedExpenses   = otherFixedExpenses,
        signupIp             = signupIp,
        country              = country
    )
}
