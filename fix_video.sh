#!/bin/bash
TOKEN=$(curl -s -X POST http://127.0.0.1:4080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"xdoanhso.data@gmail.com","password":"Admin@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: ${TOKEN:0:30}..."

echo "Fixing video URL with camelCase keys..."
curl -s -X PATCH "http://127.0.0.1:4080/api/webinars/4da83300-ee33-4104-ab93-678ff7d2ba11" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"videoUrl":"https://assets.cdn.filesafe.space/ZvTjUqBlrPvdA6D95vnu/media/6728633525a7316f02e5cd3f.mp4","videoType":"mp4"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['webinar']; print(f'Updated: video_type={d[\"video_type\"]}, url={d[\"video_url\"][:60]}...')"

echo ""
echo "Public API verify..."
curl -s http://127.0.0.1:4080/api/public/room/26010999 | python3 -c "
import sys,json
d=json.load(sys.stdin)['webinar']
print(f'video_type: {d[\"video_type\"]}')
print(f'video_url: {d[\"video_url\"]}')
"
