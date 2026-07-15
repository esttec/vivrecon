<?php
/**
 * POSTERKASSA REPLACEMENT METHODS FOR DbHandler.php
 * ===================================================
 * Replace the entire block of Poster-specific methods in DbHandler with these.
 *
 * 1. Remove these old methods from DbHandler:
 *    posterGet(), posterPost(), posterCall()
 *    posterCreateClient(), posterGetAllClientsPage(), posterGetClientById()
 *    posterGetTransactions(), posterGetTransactionById()
 *    posterUpdateClient()
 *    upsertLocalProfileFromPosterClient()
 *    handlePosterClientWebhookPayload(), verifyPosterWebhookSignature()
 *    syncAllClientsFromPosterToLocal(), syncAllBonusesFromPosterToLocal()
 *    pushAllBonusesToPoster(), pushPosterBonusForClient()
 *    importPosterBonusToLocalProfile(), importPosterBonusForAllProfiles()
 *    importAllPosterBonusesToLocalDatabase()
 *    importProductsFromPoster()
 *    createUserAndPosterCustomer(), createUserWithCardcode()
 *
 * 2. Also add to DbHandler constructor (after $this->conn setup):
 *    require_once __DIR__ . '/PosterkassaClient.php';
 *
 * 3. Add private property at top of class:
 *    private ?\PosterkassaClient $pk = null;
 *
 * 4. Add this helper at top of methods section:
 *    private function pk(): \PosterkassaClient {
 *        if ($this->pk === null) $this->pk = new \PosterkassaClient();
 *        return $this->pk;
 *    }
 */

/* ═══════════════════════════════════════════════════════════════
 *  CUSTOMER → PROFILE MAPPING HELPERS
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Convert Posterkassa customer array to the local profile field format.
 * Posterkassa bonus_balance is already in euros (Poster used cents/100).
 */
private function posterkassaCustomerToProfileFields(array $c): array
{
    $birthday = trim((string)($c['birthday'] ?? ''));
    return [
        'poster_client_id' => (int)($c['id']               ?? 0),
        'card_code'        => trim((string)($c['club_card_number'] ?? '')) ?: null,
        'first_name'       => trim((string)($c['first_name'] ?? '')) ?: null,
        'last_name'        => trim((string)($c['last_name']  ?? '')) ?: null,
        'birthdate'        => $birthday !== '' ? ($birthday . ' 00:00:00') : null,
        'kl_boonus'        => round((float)($c['bonus_balance'] ?? 0), 2),
    ];
}

/* ═══════════════════════════════════════════════════════════════
 *  CLIENT / CUSTOMER API (replaces posterGetClientById etc.)
 * ═══════════════════════════════════════════════════════════════ */

/** Returns raw Posterkassa customer array or null. */
public function posterkassaGetCustomerById(int $customerId): ?array
{
    if ($customerId <= 0) return null;
    return $this->pk()->getCustomerById($customerId);
}

/** Returns raw Posterkassa customer array found by card number, or null. */
public function posterkassaGetCustomerByCard(string $cardNumber): ?array
{
    return $this->pk()->getCustomerByCardNumber($cardNumber);
}

/** Get all customers (replaces posterGetAllClientsPage). */
public function posterkassaGetAllCustomers(): array
{
    return $this->pk()->getAllCustomers();
}

/* ═══════════════════════════════════════════════════════════════
 *  REGISTRATION — create customer in Posterkassa
 *  (replaces createUserAndPosterCustomer + createUserWithCardcode)
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Register new user: creates local user + profile + Posterkassa customer.
 * Replaces createUserAndPosterCustomer().
 */
public function createUserAndPosterkassaCustomer(
    string $firstName,
    string $lastName,
    string $email,
    string $password,
    string $birthdate
): int {
    $firstName = trim($firstName);
    $lastName  = trim($lastName);
    $email     = trim($email);

    if ($this->isUserExistsLocal($email)) return USER_ALREADY_EXISTED;

    try {
        $this->conn->beginTransaction();

        // Local user
        $this->execStatement(
            "INSERT INTO users (email, password_hash, api_key, status, role) VALUES (:e, :ph, :api, 1, 0)",
            [':e' => $email, ':ph' => \PassHash::hash($password), ':api' => $this->generateApiKey()]
        );
        $userId = $this->lastInsertId();
        if ($userId <= 0) throw new \RuntimeException('Could not get new user id');

        // Local profile (no poster_client_id yet)
        $this->createLocalProfileOnly($userId, $firstName, $lastName, $email, $birthdate);

        $profile    = $this->fetchOne("SELECT client_code FROM profiles WHERE user_id = :uid LIMIT 1", [':uid' => $userId]);
        $clientCode = trim((string)($profile['client_code'] ?? ''));
        if ($clientCode === '') throw new \RuntimeException("client_code not found for user_id={$userId}");

        // Create in Posterkassa
        $pkCustomer = $this->pk()->createCustomer([
            'first_name'       => $firstName,
            'last_name'        => $lastName,
            'email'            => $email,
            'birthday'         => substr($this->normalizeBirthdateForDb($birthdate), 0, 10) ?: null,
            'club_card_number' => $clientCode,
            'bonus_balance'    => 0,
        ]);

        $pkId = (int)($pkCustomer['id'] ?? 0);
        if ($pkId <= 0) throw new \RuntimeException('Posterkassa createCustomer failed');

        $this->execStatement(
            "UPDATE profiles SET poster_client_id = :pid, card_code = :card, ts = NOW() WHERE user_id = :uid",
            [':pid' => $pkId, ':card' => $clientCode, ':uid' => $userId]
        );

        $this->conn->commit();
        return USER_CREATED_SUCCESSFULLY;

    } catch (\Throwable $e) {
        if ($this->conn->inTransaction()) $this->conn->rollBack();
        error_log('[createUserAndPosterkassaCustomer] ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Register user by existing club card number.
 * Finds customer in Posterkassa, links to new local user.
 * Replaces createUserWithCardcode().
 */
public function createUserWithCardcodePosterkassa(
    string $cardCode,
    string $email,
    string $password,
    string $birthdate
): int {
    $cardCode = trim($cardCode);
    $email    = trim($email);

    if ($this->isUserExistsLocal($email)) return USER_ALREADY_EXISTED;

    try {
        $pkCustomer = $this->pk()->getCustomerByCardNumber($cardCode);
        if (!$pkCustomer) return USER_CREATE_FAILED_CARD_CODE;

        $pkId      = (int)($pkCustomer['id'] ?? 0);
        if ($pkId <= 0) return USER_CREATE_FAILED_CARD_CODE;

        $firstName  = trim((string)($pkCustomer['first_name'] ?? ''));
        $lastName   = trim((string)($pkCustomer['last_name']  ?? ''));
        $birthday   = trim((string)($pkCustomer['birthday']   ?? ''));
        $kl_boonus  = round((float)($pkCustomer['bonus_balance'] ?? 0), 2);
        $birthdateValue = $birthday !== '' ? ($birthday . ' 00:00:00') : $this->normalizeBirthdateForDb($birthdate);

        $this->conn->beginTransaction();

        $this->execStatement(
            "INSERT INTO users (email, password_hash, api_key, status, role) VALUES (:e, :ph, :api, 1, 0)",
            [':e' => $email, ':ph' => \PassHash::hash($password), ':api' => $this->generateApiKey()]
        );
        $userId = $this->lastInsertId();
        if ($userId <= 0) throw new \RuntimeException('Could not get new user id');

        $existing = $this->fetchOne("SELECT id FROM profiles WHERE poster_client_id = :pid LIMIT 1", [':pid' => $pkId]);
        if ($existing) {
            $this->execStatement(
                "UPDATE profiles SET user_id = :uid, card_code = :card, kl_boonus = :kb, ts = NOW() WHERE poster_client_id = :pid",
                [':uid' => $userId, ':card' => $cardCode, ':kb' => $kl_boonus, ':pid' => $pkId]
            );
        } else {
            $clientCode = $this->nextClientCode();
            $now        = date('Y-m-d H:i:s');
            $this->execStatement(
                "INSERT INTO profiles (user_id, client_code, card_code, first_name, last_name, birthdate,
                 class, kl_boonus, kl_intress, kl_taseh, kl_tasej, kl_jktp, kl_skost, ts, ts_bonus, created_at, poster_client_id)
                 VALUES (:uid,:cc,:card,:fn,:ln,:bd,10,:kb,0,1,1,5,0,:ts,NULL,:ts,:pid)",
                [':uid' => $userId, ':cc' => $clientCode, ':card' => $cardCode,
                 ':fn' => $firstName ?: null, ':ln' => $lastName ?: null,
                 ':bd' => $birthdateValue, ':kb' => $kl_boonus,
                 ':ts' => date('Y-m-d H:i:s'), ':pid' => $pkId]
            );
        }

        $this->conn->commit();
        return USER_CREATED_SUCCESSFULLY;

    } catch (\Throwable $e) {
        if ($this->conn->inTransaction()) $this->conn->rollBack();
        error_log('[createUserWithCardcodePosterkassa] ' . $e->getMessage());
        return USER_CREATE_FAILED;
    }
}

/* ═══════════════════════════════════════════════════════════════
 *  SYNC: Posterkassa → Local profiles
 *  (replaces syncAllClientsFromPosterToLocal)
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Sync all Posterkassa customers to local profiles table.
 * Creates new profiles for unknown customers, updates existing ones.
 */
public function syncAllCustomersFromPosterkassaToLocal(): array
{
    $result = ['ok' => true, 'updated' => 0, 'inserted' => 0, 'skipped' => 0, 'errors' => []];
    $customers = $this->pk()->getAllCustomers();

    foreach ($customers as $c) {
        try {
            $r = $this->upsertLocalProfileFromPosterkassaCustomer($c);
            if (!empty($r['inserted']))    $result['inserted']++;
            elseif (!empty($r['updated'])) $result['updated']++;
            else                           $result['skipped']++;
        } catch (\Throwable $e) {
            $result['errors'][] = 'customer_id=' . ($c['id'] ?? '?') . ': ' . $e->getMessage();
        }
    }
    return $result;
}

/** Upsert a single local profile from a Posterkassa customer array. */
public function upsertLocalProfileFromPosterkassaCustomer(array $c): array
{
    $pkId      = (int)($c['id'] ?? 0);
    if ($pkId <= 0) return ['updated' => 0, 'missing' => 1];

    $fields = $this->posterkassaCustomerToProfileFields($c);
    $email  = trim((string)($c['email'] ?? ''));

    // 1. Match by poster_client_id
    $exists = $this->fetchOne("SELECT user_id FROM profiles WHERE poster_client_id = :pid LIMIT 1", [':pid' => $pkId]);
    if ($exists) {
        $this->execStatement(
            "UPDATE profiles SET card_code=:card, first_name=:fn, last_name=:ln,
             birthdate=:bd, kl_boonus=:kb, ts=NOW() WHERE poster_client_id=:pid",
            [':card' => $fields['card_code'], ':fn' => $fields['first_name'],
             ':ln'   => $fields['last_name'],  ':bd' => $fields['birthdate'],
             ':kb'   => $fields['kl_boonus'],  ':pid' => $pkId]
        );
        return ['updated' => 1, 'missing' => 0];
    }

    // 2. Match by email
    if ($email !== '') {
        $user = $this->getUserByEmail($email);
        if ($user) {
            $this->execStatement(
                "UPDATE profiles SET poster_client_id=:pid, card_code=:card, first_name=:fn,
                 last_name=:ln, birthdate=:bd, kl_boonus=:kb, ts=NOW() WHERE user_id=:uid",
                [':pid' => $pkId, ':card' => $fields['card_code'], ':fn' => $fields['first_name'],
                 ':ln'  => $fields['last_name'], ':bd' => $fields['birthdate'],
                 ':kb'  => $fields['kl_boonus'], ':uid' => (int)$user['id']]
            );
            return ['updated' => 1, 'missing' => 0];
        }
    }

    if ($email === '') return ['updated' => 0, 'missing' => 1];

    // 3. Create local user + profile
    $this->execStatement(
        "INSERT INTO users (email, password_hash, api_key, status, role) VALUES (:e,:ph,:api,1,0)",
        [':e' => $email, ':ph' => \PassHash::hash(bin2hex(random_bytes(8))), ':api' => $this->generateApiKey()]
    );
    $userId     = $this->lastInsertId();
    $clientCode = $this->nextClientCode();
    $now        = date('Y-m-d H:i:s');

    $this->execStatement(
        "INSERT INTO profiles (user_id, client_code, card_code, first_name, last_name, birthdate,
         class, kl_boonus, kl_intress, kl_taseh, kl_tasej, kl_jktp, kl_skost, ts, ts_bonus, created_at, poster_client_id)
         VALUES (:uid,:cc,:card,:fn,:ln,:bd,10,:kb,0,1,1,5,0,:ts,NULL,:ts,:pid)",
        [':uid' => $userId, ':cc' => $clientCode, ':card' => $fields['card_code'],
         ':fn'  => $fields['first_name'], ':ln' => $fields['last_name'],
         ':bd'  => $fields['birthdate'],  ':kb' => $fields['kl_boonus'],
         ':ts'  => $now, ':pid' => $pkId]
    );
    return ['inserted' => 1, 'updated' => 0, 'missing' => 0];
}

/* ═══════════════════════════════════════════════════════════════
 *  BONUS SYNC: Posterkassa ↔ Local
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Pull bonus_balance from all Posterkassa customers → local kl_boonus.
 * Replaces syncAllBonusesFromPosterToLocal() and importAllPosterBonusesToLocalDatabase().
 */
public function syncAllBonusesFromPosterkassaToLocal(bool $verbose = false): array
{
    $updated = 0; $skipped = 0; $errors = 0;
    $customers = $this->pk()->getAllCustomers();

    foreach ($customers as $c) {
        try {
            $pkId  = (int)($c['id'] ?? 0);
            if ($pkId <= 0) { $skipped++; continue; }
            $bonus = round((float)($c['bonus_balance'] ?? 0), 2);
            $affected = $this->execStatement(
                "UPDATE profiles SET kl_boonus = :b, ts = NOW() WHERE poster_client_id = :pid",
                [':b' => $bonus, ':pid' => $pkId]
            );
            $affected ? $updated++ : $skipped++;
            if ($verbose) error_log("[sync-bonus] pk_id={$pkId} bonus={$bonus}€");
        } catch (\Throwable $e) {
            $errors++;
            if ($verbose) error_log('[sync-bonus] ERROR: ' . $e->getMessage());
        }
    }
    return ['updated' => $updated, 'skipped' => $skipped, 'errors' => $errors];
}

/**
 * Push local kl_boonus → Posterkassa bonus_balance for all profiles.
 * Replaces pushAllBonusesToPoster().
 */
public function pushAllBonusesToPosterkassa(bool $verbose = false): array
{
    $rows = $this->fetchAll(
        "SELECT id, poster_client_id, kl_boonus FROM profiles WHERE poster_client_id > 0 ORDER BY id"
    );
    $seen = $processed = $errors = 0;
    foreach ($rows as $row) {
        $seen++;
        try {
            $this->pk()->updateCustomerBonus((int)$row['poster_client_id'], (float)$row['kl_boonus']);
            $processed++;
            if ($verbose) error_log("[push-bonus] pk_id={$row['poster_client_id']} bonus={$row['kl_boonus']}€");
        } catch (\Throwable $e) {
            $errors++;
            if ($verbose) error_log('[push-bonus] ERROR: ' . $e->getMessage());
        }
    }
    return ['seen' => $seen, 'processed' => $processed, 'errors' => $errors];
}

/**
 * Push bonus for a single Posterkassa customer.
 * Replaces pushPosterBonusForClient().
 */
private function pushPosterkassaBonusForCustomer(int $pkCustomerId, float $newBonus): array
{
    if ($pkCustomerId <= 0) return ['ok' => false, 'reason' => 'invalid_customer_id'];
    $result = $this->pk()->updateCustomerBonus($pkCustomerId, $newBonus);
    return ['ok' => true, 'customer_id' => $pkCustomerId, 'bonus_eur' => $newBonus, 'response' => $result];
}

/**
 * Import bonus from Posterkassa for a single local profile.
 * Replaces importPosterBonusToLocalProfile().
 */
public function importPosterkassaBonusToLocalProfile(int $pkCustomerId): array
{
    if ($pkCustomerId <= 0) return ['ok' => false, 'reason' => 'invalid_customer_id'];

    $c = $this->pk()->getCustomerById($pkCustomerId);
    if (!$c) return ['ok' => false, 'reason' => 'customer_not_found_in_posterkassa'];

    $bonus   = round((float)($c['bonus_balance'] ?? 0), 2);
    $profile = $this->fetchOne("SELECT id FROM profiles WHERE poster_client_id = :pid LIMIT 1", [':pid' => $pkCustomerId]);
    if (!$profile) return ['ok' => false, 'reason' => 'local_profile_not_found'];

    $this->execStatement("UPDATE profiles SET kl_boonus = :b WHERE id = :id", [':b' => $bonus, ':id' => (int)$profile['id']]);
    return ['ok' => true, 'profile_id' => (int)$profile['id'], 'bonus' => $bonus];
}

/* ═══════════════════════════════════════════════════════════════
 *  ORDERS (replaces Poster transaction methods)
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Get orders from Posterkassa in a date range.
 * Replaces posterGetTransactions().
 * Returns array of order arrays, each with 'lines' (products).
 */
public function posterkassaGetOrders(string $dateFrom, string $dateTo): array
{
    return $this->pk()->getOrdersByDateRange($dateFrom, $dateTo);
}

/**
 * Get single order by ID.
 * Replaces posterGetTransactionById().
 */
public function posterkassaGetOrderById(int $orderId): ?array
{
    return $this->pk()->getOrderById($orderId);
}

/**
 * Process Posterkassa orders in a date range and add bonus.
 * Replaces processPosterTransactionsAndAddBonus().
 */
public function processPosterkassaOrdersAndAddBonus(
    string $dateFrom,
    string $dateTo,
    bool $verbose = false
): array {
    $log = fn(string $m) => $verbose && error_log('[pk-orders] ' . $m);

    $seen = $processed = $skipped = $errors = 0;
    $errorMessages = [];

    $orders = $this->posterkassaGetOrders($dateFrom, $dateTo);
    $log('fetched=' . count($orders) . " orders from {$dateFrom} to {$dateTo}");

    foreach ($orders as $order) {
        if (!is_array($order)) { $errors++; continue; }
        $seen++;
        $orderId = (int)($order['id'] ?? 0);
        if ($orderId <= 0) { $errors++; continue; }

        try {
            $result = $this->processPosterkassaOrderWebhook($order);
            if (!empty($result['skipped'])) {
                $skipped++;
                $log("SKIP order={$orderId}: " . ($result['reason'] ?? ''));
            } else {
                $processed++;
                $log("OK order={$orderId} bonus_added=" . ($result['bonus_added'] ?? 0));
            }
        } catch (\Throwable $e) {
            $errors++;
            $msg = "order={$orderId}: " . $e->getMessage();
            $errorMessages[] = $msg;
            $log('ERROR ' . $msg);
        }
    }
    return [
        'ok'             => $errors === 0,
        'seen'           => $seen,
        'processed'      => $processed,
        'skipped'        => $skipped,
        'errors'         => $errors,
        'error_messages' => $errorMessages,
    ];
}

/**
 * Cron: scan recent orders (last N minutes) and credit bonus.
 * Replaces cronScanRecentTransactionsAndUpdateBonus().
 */
public function cronScanRecentPosterkassaOrdersAndUpdateBonus(bool $verbose = false, int $minutes = 5): array
{
    $dateFrom = date('Y-m-d H:i:s', strtotime("-{$minutes} minutes"));
    $dateTo   = date('Y-m-d H:i:s');
    return $this->processPosterkassaOrdersAndAddBonus($dateFrom, $dateTo, $verbose);
}

/**
 * Cron: process all orders from today.
 * Replaces cronProcessPosterBonusToday().
 */
public function cronProcessPosterkassaBonusToday(bool $verbose = true): array
{
    $date = date('Y-m-d');
    return $this->processPosterkassaOrdersAndAddBonus($date . ' 00:00:00', $date . ' 23:59:59', $verbose);
}

/* ═══════════════════════════════════════════════════════════════
 *  PRODUCTS (replaces importProductsFromPoster)
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Import products from Posterkassa into local products table.
 * Replaces importProductsFromPoster().
 */
public function importProductsFromPosterkassa(bool $verbose = true): array
{
    $seen = $inserted = $updated = $errors = 0;
    $products = $this->pk()->getAllProducts();

    $sql = "INSERT INTO products
            (poster_product_id, product_name, category_id, category_name, price,
             barcode, sku, visible, poster_deleted, raw_json, poster_synced_at)
            VALUES
            (:pid,:name,:cat_id,:cat_name,:price,:barcode,:sku,:visible,0,:raw,NOW())
            ON DUPLICATE KEY UPDATE
            product_name=VALUES(product_name), category_id=VALUES(category_id),
            price=VALUES(price), visible=VALUES(visible), raw_json=VALUES(raw_json),
            poster_synced_at=NOW()";
    $stmt = $this->conn->prepare($sql);

    foreach ($products as $p) {
        if (!is_array($p)) continue;
        $seen++;
        $pid = (int)($p['id'] ?? 0);
        if ($pid <= 0) { $errors++; continue; }
        try {
            $stmt->execute([
                ':pid'      => $pid,
                ':name'     => trim((string)($p['name'] ?? $p['product_name'] ?? 'Unnamed')),
                ':cat_id'   => isset($p['category_id'])   ? (int)$p['category_id']    : null,
                ':cat_name' => isset($p['category_name'])  ? trim((string)$p['category_name']) : null,
                ':price'    => isset($p['price'])           ? (float)$p['price']        : null,
                ':barcode'  => isset($p['barcode'])         ? trim((string)$p['barcode']) : null,
                ':sku'      => isset($p['code'])            ? trim((string)$p['code'])  : null,
                ':visible'  => isset($p['is_active'])       ? ((bool)$p['is_active'] ? 1 : 0) : 1,
                ':raw'      => json_encode($p, JSON_UNESCAPED_UNICODE),
            ]);
            $stmt->rowCount() === 1 ? $inserted++ : $updated++;
        } catch (\Throwable $e) {
            $errors++;
            if ($verbose) error_log('[importProductsFromPosterkassa] ' . $e->getMessage());
        }
    }
    return ['seen' => $seen, 'inserted' => $inserted, 'updated' => $updated, 'errors' => $errors];
}

/* ═══════════════════════════════════════════════════════════════
 *  PROMO — bonus type: push to Posterkassa
 *  Update applyPromoCode() bonus branch to use this
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Add bonus to a Posterkassa customer (used by promo code 'bonus' type).
 * Replaces the Poster bonus update inside applyPromoCode().
 *
 * Usage in applyPromoCode():
 *   $result = $this->applyPromoBonusToPosterkassaCustomer($posterClientId, $value);
 */
public function applyPromoBonusToPosterkassaCustomer(int $pkCustomerId, float $amountToAdd): array
{
    if ($pkCustomerId <= 0) return ['ok' => false, 'reason' => 'invalid_customer_id'];

    $customer = $this->pk()->getCustomerById($pkCustomerId);
    if (!$customer) return ['ok' => false, 'reason' => 'customer_not_found'];

    $currentBonus = round((float)($customer['bonus_balance'] ?? 0), 2);
    $newBonus     = round($currentBonus + $amountToAdd, 2);

    $this->pk()->updateCustomerBonus($pkCustomerId, $newBonus);
    return ['ok' => true, 'new_bonus' => $newBonus];
}

/* ═══════════════════════════════════════════════════════════════
 *  NIGHTLYSYNC — replaces nightlySyncBonusAndInterest Poster part
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Full nightly sync: pull bonuses from Posterkassa + recalculate interest.
 * Call this from cron instead of old Poster nightly sync.
 */
public function nightlySyncPosterkassa(bool $verbose = false): array
{
    $bonusSync    = $this->syncAllBonusesFromPosterkassaToLocal($verbose);
    $interestSync = $this->nightlySyncBonusAndInterest($verbose);
    return ['bonus_sync' => $bonusSync, 'interest_sync' => $interestSync];
}
