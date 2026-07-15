package com.vivrecon.service

import com.stripe.Stripe
import com.stripe.model.Subscription
import com.stripe.model.checkout.Session
import com.stripe.net.Webhook
import com.stripe.param.CustomerCreateParams
import com.stripe.param.checkout.SessionCreateParams
import com.vivrecon.dto.CheckoutResponse
import com.vivrecon.repo.UserRepository
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * Stripe Checkout billing. One hosted page handles card, Apple Pay, Google Pay
 * and PayPal (which payment methods appear is controlled in the Stripe
 * dashboard). We never see card data — Stripe does, so we stay PCI-compliant.
 *
 * Required env / config (server-side only):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY,
 *   STRIPE_PRICE_YEARLY, APP_BASE_URL
 */
@Service
class BillingService(
    private val userRepo: UserRepository,
    @Value("\${vivrecon.stripe.secret-key:}") private val secretKey: String,
    @Value("\${vivrecon.stripe.webhook-secret:}") private val webhookSecret: String,
    @Value("\${vivrecon.stripe.price-monthly:}") private val priceMonthly: String,
    @Value("\${vivrecon.stripe.price-yearly:}") private val priceYearly: String,
    @Value("\${vivrecon.app.base-url:http://localhost:5173}") private val baseUrl: String,
) {
    private val log = LoggerFactory.getLogger(BillingService::class.java)

    @PostConstruct
    fun init() {
        if (secretKey.isNotBlank()) Stripe.apiKey = secretKey
        else log.warn("Stripe secret key not set — billing endpoints will return an error until STRIPE_SECRET_KEY is configured.")
    }

    /** Create a Checkout Session for a monthly or yearly subscription. */
    @Transactional
    fun createCheckout(userId: Long, plan: String): CheckoutResponse {
        check(secretKey.isNotBlank()) { "Billing is not configured (missing Stripe key)." }
        val price = when (plan.lowercase()) {
            "yearly" -> priceYearly
            else -> priceMonthly
        }
        check(price.isNotBlank()) { "Stripe price id for '$plan' is not configured." }

        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }

        // Reuse a Stripe customer per user so subscriptions stay linked.
        val customerId = user.stripeCustomerId ?: run {
            val customer = com.stripe.model.Customer.create(
                CustomerCreateParams.builder()
                    .setEmail(user.email)
                    .putMetadata("userId", user.id.toString())
                    .build()
            )
            user.stripeCustomerId = customer.id
            userRepo.save(user)
            customer.id
        }

        val params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
            .setCustomer(customerId)
            .setSuccessUrl("$baseUrl/premium?checkout=success")
            .setCancelUrl("$baseUrl/premium?checkout=cancel")
            .setAllowPromotionCodes(true)
            // NOTE: To show an "I agree to the Terms of Service" checkbox on the Stripe
            // page, first set a Terms of service URL in Stripe Dashboard → Settings →
            // Checkout and Payment Links (pointing at https://<your-domain>/terms), then
            // uncomment the block below. It is disabled for now so local testing works.
            // .setConsentCollection(
            //     SessionCreateParams.ConsentCollection.builder()
            //         .setTermsOfService(SessionCreateParams.ConsentCollection.TermsOfService.REQUIRED)
            //         .build()
            // )
            .addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setPrice(price)
                    .setQuantity(1L)
                    .build()
            )
            .build()

        val session = Session.create(params)
        return CheckoutResponse(url = session.url)
    }

    /** Verify + process a Stripe webhook event. Returns true if handled. */
    @Transactional
    fun handleWebhook(payload: String, signature: String?): Boolean {
        check(webhookSecret.isNotBlank()) { "Webhook secret not configured." }
        val event = Webhook.constructEvent(payload, signature ?: "", webhookSecret)

        when (event.type) {
            "checkout.session.completed" -> {
                val session = event.dataObjectDeserializer.getObject().orElse(null) as? Session ?: return false
                val subId = session.subscription ?: return false
                val sub = Subscription.retrieve(subId)
                applySubscription(sub)
            }
            "customer.subscription.updated", "invoice.paid", "invoice.payment_succeeded" -> {
                val sub = resolveSubscription(event) ?: return false
                applySubscription(sub)
            }
            "customer.subscription.deleted" -> {
                val sub = event.dataObjectDeserializer.getObject().orElse(null) as? Subscription ?: return false
                // Access remains until the end of the paid period, then lapses.
                applySubscription(sub)
            }
            else -> return false
        }
        return true
    }

    private fun resolveSubscription(event: com.stripe.model.Event): Subscription? {
        val obj = event.dataObjectDeserializer.getObject().orElse(null)
        return when (obj) {
            is Subscription -> obj
            is com.stripe.model.Invoice -> obj.subscription?.let { Subscription.retrieve(it) }
            else -> null
        }
    }

    private fun applySubscription(sub: Subscription) {
        val customerId = sub.customer ?: return
        val user = userRepo.findByStripeCustomerId(customerId).orElse(null) ?: return
        user.stripeSubscriptionId = sub.id
        // current_period_end is a unix timestamp; grant premium until then.
        val end = sub.currentPeriodEnd
        user.premiumUntil = if (end != null) Instant.ofEpochSecond(end) else user.premiumUntil
        userRepo.save(user)
        log.info("Updated premium for user ${user.id} until ${user.premiumUntil} (sub ${sub.status})")
    }
}
