#!/bin/bash
# Timeweb VPS: hockey-stars.com (PHP site + Expo Web static) + api proxy
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx curl \
  php-fpm php-cli php-curl php-json php-mbstring php-xml

PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
echo "PHP version: $PHP_VER"

mkdir -p /var/www/hockeystars-site
mkdir -p /var/www/hockeystars-web
chown -R www-data:www-data /var/www/hockeystars-site /var/www/hockeystars-web

# Replace PHP socket version in nginx config if needed
CONF_SRC="/tmp/hockey-stars.com.conf"
if [ -f "$CONF_SRC" ]; then
  sed "s/php8.2-fpm.sock/php${PHP_VER}-fpm.sock/g" "$CONF_SRC" > /etc/nginx/sites-available/hockey-stars.com
  ln -sf /etc/nginx/sites-available/hockey-stars.com /etc/nginx/sites-enabled/hockey-stars.com
fi

# Keep api vhost if separate file exists
if [ -f /etc/nginx/sites-available/api.hockey-stars.com ]; then
  ln -sf /etc/nginx/sites-available/api.hockey-stars.com /etc/nginx/sites-enabled/
elif [ -f /etc/nginx/sites-available/api ]; then
  ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
fi

rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx php${PHP_VER}-fpm
systemctl reload nginx
systemctl restart php${PHP_VER}-fpm

echo "SITE_SETUP_OK php=${PHP_VER}"
