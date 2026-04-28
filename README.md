# Ai Webinar SaaS Platform

> **Thương hiệu: The Solo Shop**
> Nền tảng tạo webinar tự động chuyên nghiệp

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt

## Cài đặt

### 1. Clone & Install
```bash
git clone https://github.com/Dinh2026/Aiwebinar.git
cd Aiwebinar

# Backend
cd server && npm install
cp .env.example .env  # Chỉnh sửa DATABASE_URL

# Frontend
cd ../client && npm install
```

### 2. Setup Database
```bash
cd server
npm run seed
```

### 3. Chạy Development
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

### 4. Build Production
```bash
cd client && npm run build
cd ../server && npm start
```

## Tài khoản Super Admin
- Email: `xdoanhso.data@gmail.com`
- Password: (thiết lập trong .env)

## API Endpoints
- `POST /api/auth/login` — Đăng nhập
- `GET /api/webinars` — Danh sách webinar
- `POST /api/webinars` — Tạo webinar
- `GET /api/public/room/:roomCode` — Phòng webinar public
- `POST /api/public/room/:roomCode/checkin` — Check-in
- `GET /api/analytics/overview` — Dashboard stats

## Deploy
- Port: `4080`
- Directory: `/opt/aiwebinar`
