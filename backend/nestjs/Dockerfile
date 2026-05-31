# ใช้ Node.js เวอร์ชัน 20 เป็นพื้นฐาน
FROM node:20-alpine

# ตั้งค่าโฟลเดอร์หลักใน Container
WORKDIR /app

# ก๊อปปี้ไฟล์ package.json มาติดตั้งก่อน (เทคนิคนี้ช่วยให้ build เร็วขึ้น)
COPY package*.json ./
RUN npm install

# ก๊อปปี้โค้ดทั้งหมดในโฟลเดอร์ nestjs เข้ามา
COPY . .

# สั่ง Build โปรเจค NestJS เป็นไฟล์ JavaScript (ลงโฟลเดอร์ dist)
RUN npm run build

# เปิดพอร์ต 30001 ตามที่คุณตั้งไว้ใน main.ts
EXPOSE 30001

# คำสั่งรันโปรเจคตอนใช้งานจริง
CMD ["npm", "run", "start:prod"]