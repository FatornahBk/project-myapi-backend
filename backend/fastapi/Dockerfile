# ใช้ Python เวอร์ชัน 3.10 เป็นพื้นฐาน
FROM python:3.10-slim

# ตั้งค่าโฟลเดอร์หลักสำหรับทำงานใน Container
WORKDIR /app

# ก๊อปปี้ไฟล์ requirements.txt มา
COPY requirements.txt .

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0
RUN pip install --no-cache-dir -r requirements.txt

# ก๊อปปี้โค้ดทั้งหมด (รวมถึงโฟลเดอร์ models) เข้าไป
COPY . .

# เปิดพอร์ต 8000 ให้คนอื่นเรียกใช้
EXPOSE 8000

# คำสั่งสำหรับรัน FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]