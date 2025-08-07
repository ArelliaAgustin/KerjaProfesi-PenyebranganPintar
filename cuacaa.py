from flask import Flask, render_template_string
import requests
from datetime import datetime, timezone

app = Flask(__name__)

@app.route("/")
def weather():
    city = "Bandung"
    latitude, longitude = -6.9640, 107.6561

    # API request
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}&"
        f"current_weather=true&hourly=relativehumidity_2m,weathercode&timezone=auto"
    )
    response = requests.get(url)
    data = response.json()

    current = data["current_weather"]
    hourly = data["hourly"]

    # Ambil waktu saat ini dan bulatkan ke jam terdekat
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    current_hour_str = now.strftime("%Y-%m-%dT%H:00")

    try:
        index = hourly["time"].index(current_hour_str)
        humidity = hourly["relativehumidity_2m"][index]
        weather_code = hourly["weathercode"][index]
    except ValueError:
        humidity = "N/A"
        weather_code = -1

    # Mapping kode cuaca ke deskripsi
    weather_map = {
        0: "Cerah",
        1: "Cerah Berawan",
        2: "Berawan",
        3: "Mendung",
        45: "Kabut",
        48: "Kabut Tebal",
        51: "Gerimis Ringan",
        53: "Gerimis",
        55: "Gerimis Berat",
        61: "Hujan Ringan",
        63: "Hujan Sedang",
        65: "Hujan Lebat",
        71: "Salju Ringan",
        73: "Salju Sedang",
        75: "Salju Lebat",
        80: "Hujan Singkat Ringan",
        81: "Hujan Singkat",
        82: "Hujan Singkat Lebat",
    }
    weather_desc = weather_map.get(weather_code, "Tidak diketahui")

    return render_template_string(f"""
        <h2>Cuaca di {city}</h2>
        Cuaca: <b>{weather_desc}</b><br>
        Suhu: {current["temperature"]} °C<br>
        Kelembaban: {humidity} %<br>
        Kecepatan Angin: {current["windspeed"]} km/jam
    """)

if __name__ == "__main__":
    app.run(debug=True)
