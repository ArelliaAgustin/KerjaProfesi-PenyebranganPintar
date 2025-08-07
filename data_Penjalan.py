# mqtt_listener.py
import paho.mqtt.client as mqtt
import json

# Variabel global untuk menyimpan data terakhir
latest_data = {
    "status": "STOP",
    "count_middle": 0,
}
MQTT_BROKER = "192.168.5.114"
MQTT_PORT = 1883
MQTT_TOPIC = "pedestrian/cam1"

def on_connect(client, userdata, flags, rc):
    print("Terhubung ke MQTT Broker:", rc)
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    latest_data
    try:
        payload = msg.payload.decode()
        data = json.loads(payload)
        if data != latest_data:
            latest_data.update(data)
            print("Update data:", latest_data)
    except Exception as e:
        print("Error parsing message:", e)

def start_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start() # non-blocking
