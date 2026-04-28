#!/bin/bash
sudo -u postgres psql aiwebinar -c "UPDATE webinars SET title='Bí Quyết Kinh Doanh Online 2026', description='Hội thảo chia sẻ bí quyết xây dựng hệ thống kinh doanh online tự động, tăng doanh thu 300% với AI và automation. Dành cho chủ doanh nghiệp và freelancer.' WHERE room_code='26010999';"
echo "DONE"
