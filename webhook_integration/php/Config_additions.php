<?php
/**
 * ADD THESE LINES TO Config.php
 * (after the existing defines)
 */

// Posterkassa API connection
define('POSTERKASSA_URL',      'http://185.31.243.148:8080');  // or your domain when set up
define('POSTERKASSA_USERNAME', 'admin');
define('POSTERKASSA_PASSWORD', 'your-admin-password-here');    // the password you set for admin

// Shared secret for webhook signature verification
// Must match COFFEEIN_WEBHOOK_SECRET in Posterkassa .env
define('POSTERKASSA_WEBHOOK_SECRET', 'your-shared-secret-here');
