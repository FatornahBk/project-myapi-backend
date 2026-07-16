from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
from collections import defaultdict
import io
from typing import List
import pymysql
import os

# ---------------------------------------------------------------------------
# Database Connection Config
# ---------------------------------------------------------------------------
DB_HOST = os.getenv("DB_HOST", "mysql-db") # อ้างอิงชื่อ Service ใน Docker
DB_USER = os.getenv("DB_USERNAME", "root")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
DB_DATABASE = os.getenv("DB_DATABASE", "")

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_DATABASE,
        cursorclass=pymysql.cursors.DictCursor
    )


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONF_THRESHOLD = 0.001

MODELS = {
    "wright": YOLO("models/wright.pt"),
    "giemsa": YOLO("models/giemsa.pt"),
}


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="YOLO Inference API", root_path="/ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def read_image(upload: UploadFile) -> Image.Image:
    raw = upload.file.read()
    return Image.open(io.BytesIO(raw)).convert("RGB")


def extract_bbox(box) -> dict:
    x1, y1, x2, y2 = [round(v, 2) for v in box.xyxy[0].tolist()]
    return {
        "x1":     x1,               # มุมซ้ายบน  แกน X (pixel)
        "y1":     y1,               # มุมซ้ายบน  แกน Y (pixel)
        "x2":     x2,               # มุมขวาล่าง แกน X (pixel)
        "y2":     y2,               # มุมขวาล่าง แกน Y (pixel)
        "width":  round(x2 - x1, 2),
        "height": round(y2 - y1, 2),
    }


def group_by_class(results) -> dict:
    grouped = defaultdict(lambda: {"confidences": [], "detections": []})

    for result in results:
        for box in result.boxes:
            name       = result.names[int(box.cls[0])]
            confidence = round(float(box.conf[0]), 4)

            grouped[name]["confidences"].append(confidence)
            grouped[name]["detections"].append({
                "confidence": confidence,
                "bbox":       extract_bbox(box),
            })

    return grouped


def build_response(mode: str, filename: str, results) -> dict:
    classes = {}

    for class_name, data in group_by_class(results).items():
        confs = data["confidences"]
        classes[class_name] = {
            "count":          len(confs),
            "avg_confidence": round(sum(confs) / len(confs), 4),
            "detections":     data["detections"],
        }

    return {
        "mode":             mode,
        "filename":         filename,
        "total_detections": sum(v["count"] for v in classes.values()),
        "classes_found":    list(classes.keys()),
        "classes":          classes,
    }


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@app.post("/predict")
async def predict(
    mode:  str        = Form(..., description="wright หรือ giemsa"),
    image: UploadFile = File(..., description="ไฟล์รูปภาพ"),
):
    if mode not in MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"mode '{mode}' ไม่ถูกต้อง ใช้ได้แค่: {list(MODELS.keys())}",
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น",
        )

    pil_image = read_image(image)
    results   = MODELS[mode](pil_image, conf=CONF_THRESHOLD)

    return build_response(mode, image.filename, results)

@app.post("/predict-batch")
async def predict_batch(
    mode:   str              = Form(..., description="wright หรือ giemsa"),
    images: List[UploadFile] = File(..., description="ไฟล์รูปภาพ (สามารถอัปโหลดได้หลายไฟล์พร้อมกัน)"),
):
    if mode not in MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"mode '{mode}' ไม่ถูกต้อง ใช้ได้แค่: {list(MODELS.keys())}",
        )

    prediction_results = []

    # เชื่อมต่อฐานข้อมูลก่อนเริ่มลูป
    try:
        connection = get_db_connection()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เชื่อมต่อฐานข้อมูลล้มเหลว: {str(e)}")

    try:
        with connection.cursor() as cursor:
            # วนลูปประมวลผลรูปภาพทีละไฟล์จาก Array ที่ส่งมา
            for image in images:
                if not image.content_type.startswith("image/"):
                    prediction_results.append({
                        "filename": image.filename,
                        "error": "ไม่ใช่ไฟล์รูปภาพ ข้ามการทำงาน"
                    })
                    continue

                # 1. ค้นหา image_id และ image_name จากฐานข้อมูล
                # เนื่องจาก DB เก็บ image_path เป็น 'uploads/batches/smear-xxx.jpg' จึงใช้ LIKE %filename
                sql = "SELECT image_id, image_name FROM images WHERE image_path LIKE %s LIMIT 1"
                cursor.execute(sql, ('%' + image.filename,))
                db_record = cursor.fetchone()

                image_id = db_record["image_id"] if db_record else None
                image_name = db_record["image_name"] if db_record else "Unknown"

                # 2. ประมวลผลภาพด้วยโมเดล AI
                try:
                    pil_image = read_image(image)
                    results   = MODELS[mode](pil_image, conf=CONF_THRESHOLD)
                    
                    # 3. จัดโครงสร้างข้อมูลใหม่ให้ตรงกับผลลัพธ์ที่ต้องการ
                    image_result = build_response(mode, image.filename, results)
                    
                    formatted_result = {
                        "image_id": image_id,
                        "mode": mode,
                        "image_name": image_name,
                        "filename": image_result["filename"],
                        "total_detections": image_result["total_detections"],
                        "classes_found": image_result["classes_found"],
                        "classes": image_result["classes"]
                    }
                    
                    prediction_results.append(formatted_result)
                    
                except Exception as e:
                    prediction_results.append({
                        "filename": image.filename,
                        "error": f"เกิดข้อผิดพลาด: {str(e)}"
                    })
    finally:
        # อย่าลืมปิดคอนเนกชันฐานข้อมูลเมื่อเสร็จสิ้นการประมวลผลทั้ง Batch
        connection.close()

    # ส่งคืนข้อมูลภาพทั้งหมดที่อยู่ใน Array กลับไปให้หน้าเว็บ
    return {
        "message": "Dataset processed successfully.",
        "mode": mode,
        "total_images_processed": len(prediction_results),
        "data": prediction_results 
    }