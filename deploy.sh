#!/bin/bash
# ============================================
# Ai Webinar — VPS Setup Script
# ============================================

set -e

echo "=== Creating PostgreSQL database ==="
sudo -u postgres createdb aiwebinar 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'Aifunel2026';"
echo "✅ Database ready"

echo "=== Creating .env file ==="
cat > /opt/aiwebinar/server/.env << 'EOF'
PORT=4080
NODE_ENV=production
DATABASE_URL=postgresql://postgres:Aifunel2026@localhost:5432/aiwebinar
JWT_SECRET=thesoloshop_aiwebinar_jwt_secret_2026_very_long_and_secure
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=xdoanhso.data@gmail.com
SUPER_ADMIN_PASSWORD=Admin@2026
FRONTEND_URL=http://51.79.64.136:4080
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
EOF
echo "✅ .env created"

echo "=== Running schema and seed ==="
cd /opt/aiwebinar/server
mkdir -p uploads
node seed.js
echo "✅ Seed complete"

echo "=== Setting up PM2 ==="
pm2 delete aiwebinar 2>/dev/null || true
pm2 start index.js --name aiwebinar --cwd /opt/aiwebinar/server
pm2 save
echo "✅ PM2 started"

echo "=== Setup Nginx reverse proxy ==="
sudo tee /etc/nginx/sites-available/aiwebinar > /dev/null << 'NGINX'
server {
    listen 4080;
    server_name _;
    
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/aiwebinar /etc/nginx/sites-enabled/aiwebinar
sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || echo "Nginx config test failed, running directly"

# Actually, let's just run on port 4080 directly without nginx proxy
pm2 delete aiwebinar 2>/dev/null || true
cd /opt/aiwebinar/server
PORT=4080 pm2 start index.js --name aiwebinar
pm2 save

echo ""
echo "🚀 Ai Webinar SaaS deployed successfully!"
echo "🌐 URL: http://51.79.64.136:4080"
echo "📧 Super Admin: xdoanhso.data@gmail.com"
echo ""
