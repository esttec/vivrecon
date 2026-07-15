<?php
declare(strict_types=1);

/**
 * PosterkassaClient — HTTP client for the Posterkassa FastAPI backend.
 *
 * Replaces all Poster (joinposter.com) API calls.
 * Handles JWT authentication with file-based token cache.
 *
 * Config.php must define:
 *   POSTERKASSA_URL       e.g. 'http://185.31.243.148:8080'
 *   POSTERKASSA_USERNAME  e.g. 'admin'
 *   POSTERKASSA_PASSWORD  e.g. 'yourpassword'
 */
final class PosterkassaClient
{
    private string $baseUrl;
    private string $username;
    private string $password;
    private ?string $token = null;
    private string $tokenCacheFile;

    public function __construct()
    {
        $this->baseUrl        = rtrim((string)(defined('POSTERKASSA_URL')      ? POSTERKASSA_URL      : ''), '/');
        $this->username       = (string)(defined('POSTERKASSA_USERNAME') ? POSTERKASSA_USERNAME : 'admin');
        $this->password       = (string)(defined('POSTERKASSA_PASSWORD') ? POSTERKASSA_PASSWORD : '');
        $this->tokenCacheFile = sys_get_temp_dir() . '/posterkassa_jwt_' . md5($this->baseUrl . $this->username) . '.json';

        $this->loadCachedToken();
    }

    /* ─── TOKEN MANAGEMENT ─────────────────────────────────────── */

    private function loadCachedToken(): void
    {
        if (!file_exists($this->tokenCacheFile)) return;
        $data = json_decode((string)file_get_contents($this->tokenCacheFile), true);
        if (!is_array($data) || empty($data['token']) || empty($data['expires_at'])) return;
        // Keep token if it expires more than 5 minutes from now
        if ((int)$data['expires_at'] > time() + 300) {
            $this->token = (string)$data['token'];
        }
    }

    private function saveToken(string $token, int $expiresInMinutes = 480): void
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
        $url  = $this->baseUrl . '/api/auth/login';
        $body = json_encode(['username' => $this->username, 'password' => $this->password]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $raw  = curl_exec($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($raw === false) { $err = curl_error($ch); curl_close($ch); throw new \RuntimeException('Posterkassa login cURL: ' . $err); }
        curl_close($ch);

        if ($http !== 200) throw new \RuntimeException("Posterkassa login HTTP {$http}: {$raw}");

        $json = json_decode($raw, true);
        if (empty($json['access_token'])) throw new \RuntimeException('Posterkassa login: no access_token in response');

        $this->saveToken((string)$json['access_token'], (int)($json['expires_in_minutes'] ?? 480));
    }

    private function getToken(): string
    {
        if ($this->token === null) {
            $this->login();
        }
        return (string)$this->token;
    }

    /* ─── HTTP HELPERS ─────────────────────────────────────────── */

    private function request(string $method, string $endpoint, array $params = [], ?array $body = null): array
    {
        $url = $this->baseUrl . $endpoint;
        if ($params) $url .= '?' . http_build_query($params);

        $headers = [
            'Authorization: Bearer ' . $this->getToken(),
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        }

        $raw  = curl_exec($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($raw === false) { $err = curl_error($ch); curl_close($ch); throw new \RuntimeException("Posterkassa {$method} cURL: " . $err); }
        curl_close($ch);

        // Token expired — refresh once and retry
        if ($http === 401) {
            $this->token = null;
            @unlink($this->tokenCacheFile);
            $this->login();
            return $this->request($method, $endpoint, $params, $body);
        }

        if ($http === 204) return [];
        if ($http === 404) return [];

        if ($http < 200 || $http >= 300) {
            throw new \RuntimeException("Posterkassa {$method} {$endpoint} HTTP {$http}: {$raw}");
        }

        $json = json_decode($raw, true);
        if (!is_array($json)) throw new \RuntimeException("Posterkassa {$method} {$endpoint} invalid JSON: " . substr($raw, 0, 200));
        return $json;
    }

    public function get(string $endpoint, array $params = []): array
    {
        return $this->request('GET', $endpoint, $params);
    }

    public function post(string $endpoint, array $body): array
    {
        return $this->request('POST', $endpoint, [], $body);
    }

    public function put(string $endpoint, array $body): array
    {
        return $this->request('PUT', $endpoint, [], $body);
    }

    public function delete(string $endpoint): void
    {
        $this->request('DELETE', $endpoint);
    }

    /* ─── CUSTOMERS ────────────────────────────────────────────── */

    /** Get all customers (Posterkassa has no pagination — returns all). */
    public function getAllCustomers(): array
    {
        return $this->get('/api/customers') ?: [];
    }

    /** Get single customer by ID. */
    public function getCustomerById(int $id): ?array
    {
        if ($id <= 0) return null;
        $result = $this->get("/api/customers/{$id}");
        return $result ?: null;
    }

    /** Search customers by name, phone, card number or email. */
    public function searchCustomers(string $q, int $limit = 20): array
    {
        return $this->get('/api/customers/search', ['q' => $q, 'limit' => $limit]) ?: [];
    }

    /** Exact lookup by phone, QR code, club card number or email. */
    public function lookupCustomer(string $q): ?array
    {
        try {
            return $this->get('/api/customers/lookup', ['q' => $q]) ?: null;
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'HTTP 404')) return null;
            throw $e;
        }
    }

    /**
     * Find customer by club card number.
     * Uses /lookup first (fast), falls back to search.
     */
    public function getCustomerByCardNumber(string $cardNumber): ?array
    {
        $c = $this->lookupCustomer($cardNumber);
        if ($c) return $c;
        $results = $this->searchCustomers($cardNumber, 5);
        foreach ($results as $r) {
            if ((string)($r['club_card_number'] ?? '') === $cardNumber) return $r;
        }
        return null;
    }

    /** Create a new customer. Returns the created customer array. */
    public function createCustomer(array $data): array
    {
        return $this->post('/api/customers', $data);
    }

    /**
     * Update customer (full replace — fetches current data first to preserve fields).
     * Only the keys you pass in $changes are updated.
     */
    public function updateCustomer(int $id, array $changes): array
    {
        $current = $this->getCustomerById($id);
        if (!$current) throw new \RuntimeException("Posterkassa customer {$id} not found");

        $payload = array_merge([
            'first_name'      => $current['first_name'],
            'last_name'       => $current['last_name']       ?? null,
            'phone'           => $current['phone']           ?? null,
            'email'           => $current['email']           ?? null,
            'qr_code'         => $current['qr_code']         ?? null,
            'club_card_number'=> $current['club_card_number']?? null,
            'bonus_balance'   => $current['bonus_balance']   ?? 0,
            'category_id'     => $current['category_id']     ?? null,
            'birthday'        => $current['birthday']        ?? null,
            'marketing_opt_in'=> $current['marketing_opt_in']?? false,
        ], $changes);

        return $this->put("/api/customers/{$id}", $payload);
    }

    /** Update only bonus_balance for a customer. */
    public function updateCustomerBonus(int $id, float $newBonus): array
    {
        return $this->updateCustomer($id, ['bonus_balance' => round($newBonus, 4)]);
    }

    /* ─── ORDERS (replaces Poster transactions) ────────────────── */

    /** Get orders for a specific date (YYYY-MM-DD). */
    public function getOrdersByDate(string $date): array
    {
        return $this->get('/api/orders', ['day' => $date]) ?: [];
    }

    /** Get orders in a date range (iterates day by day). */
    public function getOrdersByDateRange(string $dateFrom, string $dateTo): array
    {
        $from   = new \DateTimeImmutable(substr($dateFrom, 0, 10));
        $to     = new \DateTimeImmutable(substr($dateTo, 0, 10));
        $all    = [];
        $cursor = $from;
        while ($cursor <= $to) {
            $day    = $cursor->format('Y-m-d');
            $orders = $this->getOrdersByDate($day);
            foreach ($orders as $o) {
                $all[] = $o;
            }
            $cursor = $cursor->modify('+1 day');
        }
        return $all;
    }

    /** Get a single order by ID. */
    public function getOrderById(int $id): ?array
    {
        $result = $this->get("/api/orders/{$id}");
        return $result ?: null;
    }

    /* ─── PRODUCTS ─────────────────────────────────────────────── */

    /** Get all active products. */
    public function getAllProducts(): array
    {
        return $this->get('/api/products') ?: [];
    }
}
