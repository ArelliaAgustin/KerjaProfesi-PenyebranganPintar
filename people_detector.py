import cv2
import json
import time
import numpy as np
from shapely.geometry import Point, Polygon
from ultralytics import YOLO
import paho.mqtt.client as mqtt

# === KONFIGURASI MQTT ===
MQTT_BROKER = "192.168.5.114"
MQTT_PORT = 1883
MQTT_TOPIC = "pedestrian/status"
mqtt_CD = 2  # cooldown publish (detik)

# === KONFIGURASI WAKTU ===
WAIT_DURATION_THRESHOLD = 5  # durasi minimal menunggu di area tunggu (detik)
CROSSING_GRACE_TIME = 2      # waktu toleransi pejalan keluar dari area crossing (detik)

DISPLAY_WIDTH, DISPLAY_HEIGHT = 1280, 640  # ukuran tampilan video

# === Fungsi utilitas ===
def resize_with_aspect_ratio(image, width=None, height=None, inter=cv2.INTER_AREA):
    (h, w) = image.shape[:2]
    if width is None and height is None:
        return image
    if width is not None:
        r = width / float(w)
        dim = (width, int(h * r))
    else:
        r = height / float(h)
        dim = (int(w * r), height)
    return cv2.resize(image, dim, interpolation=inter)

def load_area_config(path="config.json"):
    with open(path, "r") as f:
        config = json.load(f)
    return (Polygon(config["area_wait"]),
            Polygon(config["area_cross"]),
            Polygon(config["area_middle"]),
            config["area_wait"],
            config["area_cross"],
            config["area_middle"])

def init_mqtt():
    client = mqtt.Client()
    client.connect(MQTT_BROKER, MQTT_PORT)
    return client

def create_mask(frame_shape, area_wait, area_cross):
    mask = np.zeros(frame_shape[:2], dtype=np.uint8)
    cv2.fillPoly(mask, [np.array(area_wait, np.int32)], 255)
    cv2.fillPoly(mask, [np.array(area_cross, np.int32)], 255)
    return mask

def draw_areas(frame, area_wait, area_cross, area_middle):
    cv2.polylines(frame, [np.array(area_wait)], True, (0, 255, 255), 2)
    cv2.polylines(frame, [np.array(area_cross)], True, (255, 255, 0), 2)
    cv2.polylines(frame, [np.array(area_middle)], True, (75, 0, 130), 2)

def draw_lampu_status(frame, lampu_status):
    color = (0, 255, 0) if lampu_status else (0, 0, 255)
    text = "WALK" if lampu_status else "STOP"
    text_color = (0, 0, 0) if lampu_status else (255, 255, 255)
    cv2.rectangle(frame, (20, 20), (160, 70), color, -1)
    cv2.putText(frame, text, (30, 55), cv2.FONT_HERSHEY_SIMPLEX, 1, text_color, 2)

def generate_stream():
    # Load model dan video
    model = YOLO("yolo11s.pt")
    cap = cv2.VideoCapture("test_video4.mp4")

    # Load konfigurasi area
    polygon_wait, polygon_cross, polygon_middle, area_wait, area_cross, area_middle = load_area_config()

    # Inisialisasi MQTT
    client = init_mqtt()

    # Variabel status
    waiting_ids = {}
    counted_ids = set()
    lampu_hijau_pejalan = False
    green_light_start = None
    no_detection_timer = None
    last_published_time = time.time()

    crossing_duration = 0
    count_middle = 0
    count_middle_crossing = 0
    waiting_start_time = None
    time_green = []

    data_sent = False
    last_lampu_hijau = False
    crossing_duration_to_send = 0
    total_crossing_to_send = 0
    sent_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = resize_with_aspect_ratio(frame, width=DISPLAY_WIDTH)
        start_time = time.time()

        mask = create_mask(frame.shape, area_wait, area_cross)
        masked_frame = cv2.bitwise_and(frame, frame, mask=mask)

        # Jalankan deteksi YOLO
        results = model.track(
            source=masked_frame,
            classes=[0], conf=0.25, persist=True, verbose=False,
            stream=False, tracker="bytetrack.yaml")

        annotated = frame.copy()
        current_time = time.time()

        ada_di_waiting_area = False
        ada_di_crossing_area = False

        boxes_and_centers = []
        active_waiting_ids = set()

        for result in results:
            if result.boxes.id is None:
                continue

            boxes = result.boxes.xyxy.cpu().numpy()
            ids = result.boxes.id.cpu().numpy().astype(int)

            for box, id in zip(boxes, ids):
                x1, y1, x2, y2 = map(int, box)
                cx, cy = (x1 + x2) // 2, y2
                center = Point((cx, cy))

                if polygon_wait.contains(center):
                    ada_di_waiting_area = True
                    if id not in waiting_ids:
                        waiting_ids[id] = current_time
                    active_waiting_ids.add(id)
                elif polygon_cross.contains(center):
                    ada_di_crossing_area = True

                if polygon_middle.contains(center) and id not in counted_ids:
                    count_middle += 1
                    counted_ids.add(id)

                boxes_and_centers.append((x1, y1, x2, y2, cx, cy, id))

        # Visualisasi deteksi dan waktu tunggu
        for (x1, y1, x2, y2, cx, cy, id) in boxes_and_centers:
            center = Point((cx, cy))
            if polygon_wait.contains(center) and id in waiting_ids:
                elapsed = current_time - waiting_ids[id]
                cv2.putText(annotated, f"{int(elapsed)}s", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.circle(annotated, (cx, cy), 4, (0, 0, 255), -1)

        # === LOGIKA PENGATURAN LAMPU PEJALAN ===
        if ada_di_waiting_area:
            if waiting_start_time is None:
                waiting_start_time = current_time
            elif current_time - waiting_start_time >= WAIT_DURATION_THRESHOLD:
                lampu_hijau_pejalan = True
                green_light_start = current_time + WAIT_DURATION_THRESHOLD
                time_green.append(green_light_start)
                no_detection_timer = None
        else:
            waiting_start_time = None

        if lampu_hijau_pejalan:
            if ada_di_crossing_area:
                no_detection_timer = None
            else:
                if no_detection_timer is None:
                    no_detection_timer = current_time
                elif current_time - no_detection_timer > CROSSING_GRACE_TIME:
                    lampu_hijau_pejalan = False
                    waiting_start_time = None
                    waiting_ids.clear()
                    count_middle_crossing = count_middle
                    crossing_duration = time_green[-1] - time_green[0] if time_green else 0
                    green_light_start = None
                    no_detection_timer = None
        else:
            count_middle = 0
            time_green.clear()
            counted_ids.clear()

        # === Kirim crossing_duration dan total_crossing satu kali saat lampu merah ===
        if last_lampu_hijau and not lampu_hijau_pejalan and not data_sent:
            crossing_duration_to_send = crossing_duration
            total_crossing_to_send = count_middle_crossing
            data_sent = True
            sent_time = current_time
        elif data_sent and (current_time - sent_time > mqtt_CD):
            crossing_duration_to_send = 0
            total_crossing_to_send = 0
            data_sent = False
        elif lampu_hijau_pejalan:
            crossing_duration_to_send = 0
            total_crossing_to_send = 0
            data_sent = False

        # Simpan status lampu sebelumnya
        last_lampu_hijau = lampu_hijau_pejalan

        # === Kirim data MQTT ===
        if current_time - last_published_time >= mqtt_CD:
            mqtt_data = {
                "status": "WALK" if lampu_hijau_pejalan else "STOP",
                "count_middle": count_middle,
                "waktu_crossing": time_green[-1] - time_green[0] if time_green else 0,
                "crossing_duration": crossing_duration_to_send,
                "total_crossing": total_crossing_to_send,
            }
            client.publish(MQTT_TOPIC, json.dumps(mqtt_data))
            print(f"[MQTT] Published: {mqtt_data}")
            last_published_time = current_time

        # Visualisasi tambahan
        draw_areas(annotated, area_wait, area_cross, area_middle)
        draw_lampu_status(annotated, lampu_hijau_pejalan)
        cv2.putText(annotated, f"Middle Count: {count_middle}", (20, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        fps = 1 / (time.time() - start_time + 1e-6)
        cv2.putText(annotated, f"FPS: {fps:.2f}", (20, annotated.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Encode to JPEG
        _, buffer = cv2.imencode('.jpg', annotated)
        frame_bytes = buffer.tobytes()

        # Stream ke browser
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

