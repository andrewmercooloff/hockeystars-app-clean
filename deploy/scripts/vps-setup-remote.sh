#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y nginx certbot python3-certbot-nginx curl

cat > /etc/nginx/sites-available/api << 'NGINXEOF'
server {
    listen 80;
    server_name api.hockey-stars.com;

    client_max_body_size 100m;

    location / {
        proxy_pass https://jvsypfwiajuwsyuzkyda.supabase.co;
        proxy_http_version 1.1;

        proxy_ssl_server_name on;
        proxy_ssl_name jvsypfwiajuwsyuzkyda.supabase.co;

        proxy_set_header Host jvsypfwiajuwsyuzkyda.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx
echo "NGINX_OK"
