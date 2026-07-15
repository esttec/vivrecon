# Code Review — posterkassa_php_sync_patch

## Fixed file
`php/PosterkassaClient_fixed.php` — drop-in replacement for `php/include/PosterkassaClient.php`.

---

## PosterkassaClient.php — Issues

### 🔴 CRITICAL: `setCustomerBonus()` calls a non-existent endpoint

```php
// BROKEN — Posterkassa has no PATCH /customers/{id}/bonus
public function setCustomerBonus(int $customerId, float $bonusBalance): array
{
    return $this->request('PATCH', '/customers/' . $customerId . '/bonus', [...]);
}
```

Posterkassa only exposes `PUT /api/customers/{id}` (full replace).  
This will throw an HTTP 404 or 405 on every bonus push.

**Fix (in PosterkassaClient_fixed.php):** fetch current customer with GET, then send back all
fields with the new `bonus_balance` via PUT.

---

### 🟠 IMPORTANT: No token caching between PHP requests

`$this->token` is an instance property — it lives only for the duration of one PHP
request. On Zone.ee shared hosting (no persistent processes), every API call
re-authenticates against `/auth/login` before proceeding.

**Fix:** Added file-based cache in `/tmp/posterkassa_jwt_<hash>.json` with a 5-minute
expiry buffer. Works exactly like the original `PosterkassaClient.php` generated earlier.

---

### 🟡 MINOR: `posterUpdateClient()` passes raw `bonus` field to `setCustomerBonus()`

```php
private function posterUpdateClient(int $posterClientId, array $payload): array
{
    if ($posterClientId <= 0) throw ...;
    if (isset($payload['bonus'])) {
        return $this->kassa()->setCustomerBonus($posterClientId, (float)$payload['bonus']);
    }
    return $this->kassa()->updateCustomer($posterClientId, $payload);
}
```

If `$payload['bonus']` comes from old Poster-format code it would be in **cents** (e.g.
`1500` = €15.00). Posterkassa expects **euros** (`15.0`). Verify all callers before using.

---

### 🟡 MINOR: `getActiveCampaigns()` — endpoint may not exist

```php
public function getActiveCampaigns(): array
{
    return $this->request('GET', '/campaigns?active_only=true');
}
```

Check that your Posterkassa build actually has a `GET /api/campaigns` endpoint.
If it was never added you will get a 404 silently swallowed as `[]`.

Fixed version uses `http_build_query` for safe URL encoding.

---

## DbHandler.php — Issues

### 🔴 CRITICAL: SQL syntax error in `addBonusForBoughtProducts()`

Line ~1059:
```sql
UPDATE profiles
SET kl_boonus = :bonus,
    ts = NOW(),        ← trailing comma before WHERE
WHERE id = :id
```
MySQL will reject this with a syntax error. Remove the comma after `NOW()`.

---

### 🔴 CRITICAL: `processPosterTransactionsAndAddBonus()` inserts `bonus_added = 0`

The version in the patch (lines ~1842–1970) inserts bonus_transactions with
`bonus_added = 0` and defers the actual calculation to
`applyUnappliedBonusTransactionsAndPushBonusToPoster()`.

But that second function sums `bonus_added` — which is always 0 — so **zero euros are ever
pushed to Posterkassa** and zero bonus is added to any profile's `kl_boonus`.

The correct flow already exists in `processSinglePosterTransactionForBonus()` (lines
~1461–1540): it calculates `bonusToAdd = eligibleCount × rate` and inserts the real value.

**Fix:** In `processPosterTransactionsAndAddBonus()`, replace the INSERT block with a call to
`$this->processSinglePosterTransactionForBonus($transaction, $verbose)` so the bonus is
calculated per-transaction immediately.

---

### 🟠 IMPORTANT: Two-step bonus flow is never triggered by the `/bonus` route

`/bonus` → `processPosterTransactionsAndAddBonus()` — inserts records.  
`applyUnappliedBonusTransactionsAndPushBonusToPoster()` — applies them.

The second step is **never called automatically**. You either need to:
- Call it at the end of `processPosterTransactionsAndAddBonus()`, or
- Add a separate `/poster/apply-bonus` route and call it from cron.

---

## What is good in the patch ✅

- `PosterkassaHttpException` with `public readonly int $statusCode` — clean error handling
- `orderToLegacyTransaction()` — excellent bridge for backward compatibility
- `JSON_THROW_ON_ERROR` — proper exception on malformed JSON
- `SSL_VERIFYPEER => true` — more secure than the generated version
- Constructor accepts injected credentials — easier to unit-test
- `kassaCustomerToLegacyShape()` converts Posterkassa euros → Poster cents for all old code paths
- `processSinglePosterTransactionForBonus()` logic is correct
