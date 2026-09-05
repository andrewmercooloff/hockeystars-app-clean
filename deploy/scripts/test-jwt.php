<?php
require '/var/www/hockeystars-site/includes/auth-otp.php';
$jwt = hs_notificore_jwt();
echo $jwt ? ('JWT_OK len=' . strlen($jwt)) : 'JWT_FAIL';
echo PHP_EOL;
