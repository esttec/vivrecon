<?php
/**
 * INDEX.PHP ROUTE UPDATES
 * =======================
 * Replace the old Poster-specific routes with these.
 * Add before $app->run()
 */

// ── Replace /register route ────────────────────────────────────────
// Change createUserAndPosterCustomer → createUserAndPosterkassaCustomer
// Change createUserWithCardcode      → createUserWithCardcodePosterkassa
//
// In the existing /register route, find:
//   $result = $db->createUserAndPosterCustomer(...)
// Replace with:
//   $result = $db->createUserAndPosterkassaCustomer(...)
//
// And find:
//   $result = $db->createUserWithCardcode(...)
// Replace with:
//   $result = $db->createUserWithCardcodePosterkassa(...)


// ── Replace /bonus route ────────────────────────────────────────────
$app->get('/bonus', function ($request, $response) {
    $db = new \DbHandler();
    try {
        $q        = $request->getQueryParams();
        $dateFrom = $q['date_from'] ?? date('Y-m-d 00:00:00');
        $dateTo   = $q['date_to']   ?? date('Y-m-d 23:59:59');

        $result = $db->processPosterkassaOrdersAndAddBonus($dateFrom, $dateTo, true);

        $response->getBody()->write(json_encode(
            ['ok' => true, 'result' => $result],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Throwable $e) {
        $response->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});


// ── Replace /clients route ─────────────────────────────────────────
$app->get('/clients', function ($request, $response) {
    try {
        $db      = new \DbHandler();
        $clients = $db->posterkassaGetAllCustomers();

        $response->getBody()->write(json_encode(
            ['ok' => true, 'count' => count($clients), 'clients' => $clients],
            JSON_UNESCAPED_UNICODE
        ));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Throwable $e) {
        $response->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});


// ── Replace /poster/import-products route ─────────────────────────
$app->get('/poster/import-products', function ($request, $response) {
    $db     = new \DbHandler();
    $result = $db->importProductsFromPosterkassa(true);

    $response->getBody()->write(json_encode(
        ['ok' => true, 'result' => $result],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    ));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});


// ── New: sync all customers from Posterkassa ───────────────────────
$app->get('/poster/sync-clients', function ($request, $response) {
    $db     = new \DbHandler();
    $result = $db->syncAllCustomersFromPosterkassaToLocal();

    $response->getBody()->write(json_encode(
        ['ok' => true, 'result' => $result],
        JSON_UNESCAPED_UNICODE
    ));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});


// ── New: sync bonuses Posterkassa → local ──────────────────────────
$app->get('/poster/sync-bonuses', function ($request, $response) {
    $db     = new \DbHandler();
    $result = $db->syncAllBonusesFromPosterkassaToLocal(true);

    $response->getBody()->write(json_encode(
        ['ok' => true, 'result' => $result],
        JSON_UNESCAPED_UNICODE
    ));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});


// ── Webhook receiver (from webhook_route.php) ──────────────────────
$app->post('/webhook/posterkassa', function (\Psr\Http\Message\ServerRequestInterface $req, \Psr\Http\Message\ResponseInterface $res) {
    $secret  = defined('POSTERKASSA_WEBHOOK_SECRET') ? POSTERKASSA_WEBHOOK_SECRET : '';
    $rawBody = (string)$req->getBody();

    if ($secret !== '') {
        $received = $req->getHeaderLine('X-Posterkassa-Signature');
        $expected = hash_hmac('sha256', $rawBody, $secret);
        if (!hash_equals($expected, $received)) {
            return json($res, 401, ['ok' => false, 'error' => 'invalid_signature']);
        }
    }

    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        return json($res, 400, ['ok' => false, 'error' => 'invalid_json']);
    }

    $event = (string)($payload['event'] ?? '');
    if ($event !== 'order.completed') {
        return json($res, 200, ['ok' => true, 'skipped' => true, 'event' => $event]);
    }

    try {
        $db     = new \DbHandler();
        $result = $db->processPosterkassaOrderWebhook($payload);
        return json($res, 200, ['ok' => true, 'result' => $result]);
    } catch (\Throwable $e) {
        error_log('[webhook/posterkassa] ' . $e->getMessage());
        return json($res, 500, ['ok' => false, 'error' => $e->getMessage()]);
    }
});
