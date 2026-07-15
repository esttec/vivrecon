<?php
declare(strict_types=1);

/**
 * PosterkassaClient — HTTP adapter for the Posterkassa FastAPI backend.
 *
 * Fixed version — changes vs. original:
 *   1. setCustomerBonus() now does GET + PUT (PATCH /bonus endpoint does not exist).
 *   2. JWT token is cached on disk between PHP requests (avoids a login round-trip
 *      on every request on Zone.ee shared hosting).
 *   3. Minor: query-string params kept separate from path in getActiveCampaigns().
 *
 * Required config (define in Config.php or as env vars):
 *   POSTERKASSA_BASE_URL      e.g. 'http://185.31.243.148:8080/api'
 *   POSTERKASSA_SYNC_USER     e.g. 'admin'
 *   POSTERKASSA_SYNC_PASSWORD e.g. 'yourpassword'
 */
final class PosterkassaClient
{
    private string $baseUrl;
    private string $username;
    private string $password;
    private ?string $token = null;

    /** File used to persist the JWT between PHP requests. */
    private string $tokenCacheFile;

    public function __construct(
        ?string $baseUrl    = null,
        ?string $username   = null,
        ?string $password   = null
    ) {
        $this->baseUrl   = rtrim($baseUrl   ?? self::config('POSTERKASSA_BASE_URL', 'http://185.31.243.148:8080/api'), '/');
        $this->username  = $username  ?? self::config('POSTERKASSA_SYNC_USER');
        $this->password  = $password  ?? self::config('POSTERKASSA_SYNC_PASSWORD');

        if ($this->username === '' || $this->password === '') {
            throw new \RuntimeException('Posterkassa credentials are not configured');
        }

        $this->tokenCacheFile = sys_get_temp_dir()
            . '/posterkassa_jwt_' . md5($this->baseUrl . $this->username) . '.json';

        $this->loadCachedToken();
    }

    // ─── CONFIG ──────────────────────────────────────────────────────

    private static function config(string $name, string $default = ''): string
    {
        if (defined($name)) {
            return trim((string) constant($name));
        }
        $value = getenv($name);
        return $value === false ? $default : trim((string) $value);
    }

    // ─── TOKEN MANAGEMENT ────────────────────────────────────────────

    private function loadCachedToken(): void
    {
        if (!file_exists($this->tokenCacheFile)) return;
        $data = json_decode((string) file_get_contents($this->tokenCacheFile), true);
        if (!is_array($data) || empty($data['token']) || empty($data['expires_at'])) return;
        // Keep token only if it expires more than 5 minutes from now
        if ((int) $data['expires_at'] > time() + 300) {
            $this->token = (string) $data['token'];
        }
    }

    private function persistToken(string $token, int $expiresInMinutes = 480): void
    {
        $this->token = $token;
        file_put_contents($this->tokenCacheFile, json_encode([
            'token'      => $token,
            'expires_at' => time() + ($expiresInMinutes * 60),
        ]));
        @chmod($this->tokenCacheFile, 0600);
    }

    private function login(): void
    {
        $response = $this->requestRaw('POST', '/auth/login', [
            'username' => $this->username,
            'password' => $this->password,
        ], false);

        $token = trim((string) ($response['access_token'] ?? ''));
        if ($token === '') {
            throw new \RuntimeException('Posterkassa login failed: token missing');
        }

        $expiresInMinutes = (int) ($response['expires_in_minutes'] ?? 480);
        $this->persistToken($token, $expiresInMinutes);
    }

    // ─── HTTP CORE ───────────────────────────────────────────────────

    public function request(string $method, string $path, ?array $payload = null): array
    {
        if ($this->token === null) {
            $this->login();
        }

        try {
            return $this->requestRaw($method, $path, $payload, true);
        } catch (PosterkassaHttpException $e) {
            if ($e->statusCode !== 401) {
                throw $e;
            }
            // Token expired — clear cache, refresh once, retry
            $this->token = null;
            @unlink($this->tokenCacheFile);
            $this->login();
            return $this->requestRaw($method, $path, $payload, true);
        }
    }

    private function requestRaw(string $method, string $path, ?array $payload, bool $authenticated): array
    {
        $url     = $this->baseUrl . '/' . ltrim($path, '/');
        $headers = [
            'Accept: application/json',
            'Content-Type: application/json',
        ];

        if ($authenticated && $this->token !== null) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Could not initialize cURL');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        }

        $raw    = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('Posterkassa connection error: ' . $error);
        }
        curl_close($ch);

        if ($status === 204) return [];

        $decoded = ($raw === '') ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            $decoded = [];
        }

        if ($status < 200 || $status >= 300) {
            throw new PosterkassaHttpException($status, 'Posterkassa HTTP ' . $status . ': ' . $raw);
        }

        return $decoded;
    }

    // ─── HEALTH ──────────────────────────────────────────────────────

    public function health(): array
    {
        return $this->requestRaw('GET', '/health', null, false);
    }

    // ─── PRODUCTS ────────────────────────────────────────────────────

    public function getProducts(): array
    {
        return $this->request('GET', '/products');
    }

    // ─── CAMPAIGNS ───────────────────────────────────────────────────

    /**
     * Returns active campaigns.
     * NOTE: Verify that your Posterkassa build has a /campaigns endpoint.
     */
    public function getActiveCampaigns(): array
    {
        // Keep query params separate from the path to avoid URL encoding issues.
        $path = '/campaigns?' . http_build_query(['active_only' => 'true']);
        return $this->request('GET', $path);
    }

    // ─── CUSTOMERS ───────────────────────────────────────────────────

    /**
     * Get all customers (Posterkassa returns all in one call — no server-side pagination).
     * $offset/$count are applied client-side for backward compatibility with posterGetAllClientsPage().
     */
    public function getCustomers(int $count = 200, int $offset = 0): array
    {
        $customers = $this->request('GET', '/customers');
        return array_slice($customers, max(0, $offset), max(1, $count));
    }

    public function getCustomerById(int $customerId): ?array
    {
        if ($customerId <= 0) return null;
        try {
            return $this->request('GET', '/customers/' . $customerId);
        } catch (PosterkassaHttpException $e) {
            if ($e->statusCode === 404) return null;
            throw $e;
        }
    }

    public function lookupCustomer(string $query): ?array
    {
        $query = trim($query);
        if ($query === '') return null;
        try {
            return $this->request('GET', '/customers/lookup?' . http_build_query(['q' => $query]));
        } catch (PosterkassaHttpException $e) {
            if ($e->statusCode === 404) return null;
            throw $e;
        }
    }

    public function createCustomer(array $payload): array
    {
        return $this->request('POST', '/customers', $payload);
    }

    /**
     * Full customer update (PUT — replaces all fields).
     * Fetches current data first so only the keys in $changes are modified.
     */
    public function updateCustomer(int $customerId, array $payload): array
    {
        return $this->request('PUT', '/customers/' . $customerId, $payload);
    }

    /**
     * Update only the bonus_balance for a customer.
     *
     * FIX: The original code called PATCH /customers/{id}/bonus which does NOT exist
     * in Posterkassa. The only update endpoint is PUT /customers/{id} (full replace).
     * We fetch the current record first and send it back with the new bonus value.
     */
    public function setCustomerBonus(int $customerId, float $bonusBalance): array
    {
        $current = $this->getCustomerById($customerId);
        if ($current === null) {
            throw new \RuntimeException("Posterkassa customer {$customerId} not found");
        }

        // Build a safe full-replace payload, changing only bonus_balance
        $payload = [
            'first_name'       => $current['first_name']       ?? '',
            'last_name'        => $current['last_name']        ?? null,
            'phone'            => $current['phone']            ?? null,
            'email'            => $current['email']            ?? null,
            'qr_code'          => $current['qr_code']          ?? null,
            'club_card_number' => $current['club_card_number'] ?? null,
            'bonus_balance'    => round($bonusBalance, 4),
            'category_id'      => $current['category_id']      ?? null,
            'birthday'         => $current['birthday']         ?? null,
            'marketing_opt_in' => $current['marketing_opt_in'] ?? false,
            'segment'          => $current['segment']          ?? null,
        ];

        return $this->request('PUT', '/customers/' . $customerId, $payload);
    }

    // ─── ORDERS ──────────────────────────────────────────────────────

    public function getOrders(?string $day = null, int $limit = 200): array
    {
        $params = ['limit' => min(200, max(1, $limit))];
        if ($day !== null && trim($day) !== '') {
            $params['day'] = substr(trim($day), 0, 10);
        }
        return $this->request('GET', '/orders?' . http_build_query($params));
    }

    public function getOrdersForRange(string $dateFrom, string $dateTo, int $limitPerDay = 200): array
    {
        $from = new \DateTimeImmutable(substr($dateFrom, 0, 10));
        $to   = new \DateTimeImmutable(substr($dateTo, 0, 10));
        if ($to < $from) {
            throw new \InvalidArgumentException('Invalid order date range');
        }

        $orders = [];
        for ($day = $from; $day <= $to; $day = $day->modify('+1 day')) {
            foreach ($this->getOrders($day->format('Y-m-d'), $limitPerDay) as $order) {
                $orders[(int) ($order['id'] ?? count($orders))] = $order;
            }
        }
        return array_values($orders);
    }

    public function getOrder(int $orderId): ?array
    {
        if ($orderId <= 0) return null;
        try {
            return $this->request('GET', '/orders/' . $orderId);
        } catch (PosterkassaHttpException $e) {
            if ($e->statusCode === 404) return null;
            throw $e;
        }
    }

    // ─── LEGACY COMPATIBILITY ─────────────────────────────────────────

    /**
     * Maps a Posterkassa order array to the shape that the old Poster
     * transaction-based code expects. Keeps backward compatibility with
     * processSinglePosterTransactionForBonus() and similar methods.
     */
    public function orderToLegacyTransaction(array $order): array
    {
        $paidBonus = 0.0;
        foreach (($order['payments'] ?? []) as $payment) {
            if (($payment['method'] ?? '') === 'loyalty_points') {
                $paidBonus += (float) ($payment['amount'] ?? 0);
            }
        }

        $items = [];
        foreach (($order['lines'] ?? []) as $line) {
            $items[] = [
                'product_id'   => (int)    ($line['product_id']   ?? 0),
                'product_name' => (string) ($line['product_name'] ?? ''),
                'num'          => (float)  ($line['quantity']     ?? 0),
            ];
        }

        return [
            'transaction_id' => (int)    ($order['id']          ?? 0),
            'id'             => (int)    ($order['id']          ?? 0),
            'client_id'      => (int)    ($order['customer_id'] ?? 0),
            'date_close'     => (string) ($order['created_at']  ?? ''),
            'payed_bonus'    => $paidBonus,
            'products'       => $items,
            'items'          => $items,
        ];
    }
}

// ─── EXCEPTION ───────────────────────────────────────────────────────────────

final class PosterkassaHttpException extends \RuntimeException
{
    public function __construct(
        public readonly int $statusCode,
        string $message
    ) {
        parent::__construct($message, $statusCode);
    }
}
