<?php
/* ================================================================
 *  ADD THIS METHOD INSIDE DbHandler class
 *  (paste before the closing brace of the class)
 * ================================================================ */

/**
 * Process an order.completed webhook payload from Posterkassa.
 *
 * Finds the matching local loyalty profile via poster_client_id = customer_id,
 * counts bonus-eligible products, and credits the bonus.
 * Uses bonus_transactions for deduplication (idempotent).
 */
public function processPosterkassaOrderWebhook(array $order): array
{
    $orderId    = (int)($order['order_id']    ?? 0);
    $customerId = (int)($order['customer_id'] ?? 0);

    if ($orderId <= 0) {
        return ['skipped' => true, 'reason' => 'missing_order_id'];
    }
    if ($customerId <= 0) {
        return ['skipped' => true, 'reason' => 'no_customer_on_order'];
    }

    // Deduplication — same order must never be processed twice
    if ($this->fetchOne(
        "SELECT 1 FROM bonus_transactions WHERE poster_transaction_id = :tx LIMIT 1",
        [':tx' => $orderId]
    )) {
        return ['skipped' => true, 'reason' => 'already_processed', 'order_id' => $orderId];
    }

    // Find local loyalty profile by Posterkassa customer_id
    // (poster_client_id column stores the external POS customer id)
    $profile = $this->fetchOne(
        "SELECT id, kl_taseh, kl_boonus FROM profiles WHERE poster_client_id = :cid LIMIT 1",
        [':cid' => $customerId]
    );
    if (!$profile) {
        // Record the transaction with 0 bonus so we don't retry endlessly
        $this->execStatement(
            "INSERT INTO bonus_transactions
             (poster_transaction_id, profile_id, eligible_count, bonus_added, applied_to_bonus_at)
             VALUES (:tx, NULL, 0, 0, NOW())",
            [':tx' => $orderId]
        );
        return ['skipped' => true, 'reason' => 'no_local_profile', 'customer_id' => $customerId];
    }

    $profileId = (int)$profile['id'];

    // Count bonus-eligible products from order lines
    $lines = $order['lines'] ?? [];
    // Normalise line format to match countEligibleProductsFromSaleItems
    // Posterkassa uses: product_id, product_name, quantity
    // The helper expects:  product_id/id, product_name/name, num/quantity/count
    $eligibleCount = $this->countEligibleProductsFromSaleItems($lines);

    // If order was paid with loyalty points, no bonus is earned
    $paidWithBonus = (bool)($order['paid_with_loyalty'] ?? false);
    if (!$paidWithBonus) {
        foreach (($order['payments'] ?? []) as $p) {
            if (in_array($p['method'] ?? '', ['loyalty_points', 'sayv'], true)) {
                $paidWithBonus = true;
                break;
            }
        }
    }

    $level      = max(1, min(5, (int)($profile['kl_taseh'] ?? 1)));
    $rate       = $this->getBonusPerDrinkByLevel($level);
    $bonusToAdd = $paidWithBonus ? 0.0 : round($eligibleCount * $rate, 2);

    try {
        $this->conn->beginTransaction();

        // Credit bonus to profile
        $this->execStatement(
            "UPDATE profiles
             SET kl_boonus = ROUND(COALESCE(kl_boonus, 0) + :bonus, 2),
                 ts        = NOW()
             WHERE id = :id",
            [':bonus' => $bonusToAdd, ':id' => $profileId]
        );

        // Record transaction (already applied)
        $this->execStatement(
            "INSERT INTO bonus_transactions
             (poster_transaction_id, profile_id, eligible_count, bonus_added, applied_to_bonus_at)
             VALUES (:tx, :pid, :cnt, :bonus, NOW())",
            [
                ':tx'    => $orderId,
                ':pid'   => $profileId,
                ':cnt'   => $eligibleCount,
                ':bonus' => $bonusToAdd,
            ]
        );

        $this->conn->commit();
    } catch (\Throwable $e) {
        if ($this->conn->inTransaction()) {
            $this->conn->rollBack();
        }
        throw $e;
    }

    return [
        'ok'             => true,
        'order_id'       => $orderId,
        'customer_id'    => $customerId,
        'profile_id'     => $profileId,
        'eligible_count' => $eligibleCount,
        'paid_with_bonus'=> $paidWithBonus,
        'bonus_added'    => $bonusToAdd,
        'level'          => $level,
        'rate'           => $rate,
    ];
}
