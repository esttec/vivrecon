# Webhook Integration — Deploy Instructions

## How it works

```
Cashier completes sale in Posterkassa
  → Posterkassa sends POST to coffeein.eu/poster/public/webhook/posterkassa
  → PHP verifies HMAC signature
  → Finds loyalty profile by customer_id
  → Credits bonus points
```

---

## Step 1 — Choose a shared secret

Generate a strong random string, e.g.:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
Save it — you need it in BOTH places below.

---

## Step 2 — Update Posterkassa on the server

### 2a. Add to `/home/ubuntu/kassa/posterkassa_dist/.env`:
```
COFFEEIN_WEBHOOK_URL=https://coffeein.eu/poster/public/webhook/posterkassa
COFFEEIN_WEBHOOK_SECRET=your-secret-here
```

### 2b. Upload via WinSCP (replace files on server):
| Local file | Upload to (server) |
|---|---|
| `posterkassa_backend/app/services/webhook.py` | `/home/ubuntu/kassa/posterkassa_dist/posterkassa_backend/app/services/webhook.py` |
| `posterkassa_backend/app/core/config.py` | `/home/ubuntu/kassa/posterkassa_dist/posterkassa_backend/app/core/config.py` |
| `posterkassa_backend/app/api/orders.py` | `/home/ubuntu/kassa/posterkassa_dist/posterkassa_backend/app/api/orders.py` |

### 2c. Rebuild Posterkassa (PuTTY):
```bash
cd /home/ubuntu/kassa/posterkassa_dist
sudo docker compose down && sudo docker compose up -d --build
```

---

## Step 3 — Update PHP on coffeein.eu

### 3a. Add to `Config.php`:
```php
define('POSTERKASSA_WEBHOOK_SECRET', 'your-secret-here');
```
(Same secret as in Posterkassa .env)

### 3b. Add webhook route to `index.php`:
Copy the contents of `php/webhook_route.php` and paste it into `index.php`
**before** the `$app->run();` line.

### 3c. Add method to `DbHandler.php`:
Copy the contents of `php/DbHandler_webhook_method.php` and paste it inside
the `DbHandler` class, **before** the closing `}` of the class.

---

## Step 4 — Test

In PuTTY on the Posterkassa server, run a test webhook:
```bash
SECRET="your-secret-here"
BODY='{"event":"order.completed","order_id":999999,"customer_id":1,"total_gross":5.00,"paid_with_loyalty":false,"lines":[{"product_id":1,"product_name":"Espresso","quantity":1}],"payments":[{"method":"card","amount":5.00}]}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -s -X POST https://coffeein.eu/poster/public/webhook/posterkassa \
  -H "Content-Type: application/json" \
  -H "X-Posterkassa-Signature: $SIG" \
  -d "$BODY"
```

Expected response: `{"ok":true,"result":{"ok":true,...}}`  
(or `skipped: no_local_profile` if customer_id=1 has no loyalty profile — that's fine for testing)

---

## Important: customer_id mapping

The link between the two systems:
- **Posterkassa**: `customers.id`
- **PHP loyalty**: `profiles.poster_client_id`

When a customer registers in the mobile app, `posterCreateClient()` must be
updated to create the customer in Posterkassa instead of Poster.
See next phase: replacing `posterCreateClient` with Posterkassa API calls.
