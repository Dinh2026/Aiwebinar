#!/bin/bash
# List all webinar video configs
TOKEN=$(curl -s -X POST http://127.0.0.1:4080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"xdoanhso.data@gmail.com","password":"Admin@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s http://127.0.0.1:4080/api/webinars \
  -H "Authorization: Bearer $TOKEN" | python3 << 'PYEOF'
import sys, json
data = json.load(sys.stdin)
for w in data.get('webinars', []):
    vt = w.get('video_type', 'N/A')
    vu = w.get('video_url', 'N/A')[:80]
    print(f"  {w['title'][:30]:30s} | type={vt:8s} | url={vu}")
PYEOF
