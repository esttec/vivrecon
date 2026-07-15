<?php
/* ================================================================
 *  ADD THIS BLOCK TO index.php (before $app->run())
 *
 *  Also add to Config.php:
 *    define('POSTERKASSA_WEBHOOK_SECRET', 'same-secret-as-in-posterkassa-.env');
 * ================================================================ */

$app->post('/webhook/posterkassa', function (Request $req, Response $res) {
    $secret  = defined('POSTERKASSA_WEBHOOK_SECRET') ? POSTERKASSA_WEBHOOK_SECRET : '';
    $rawBody = (string)$req->getBody();

    // Verify HMAC-SHA256 signature
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
        // Ignore other events gracefully
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
