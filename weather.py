import requests
from datetime import datetime

def get_weather_data():
    """Fetch real-time weather data from Open-Meteo API"""
    city = "Bandung"
    latitude, longitude = -6.9640, 107.6561

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}&"
        f"current_weather=true&hourly=relativehumidity_2m,weathercode&timezone=auto"
    )
    
    try:
        response = requests.get(url)
        data = response.json()

        current = data["current_weather"]
        hourly = data["hourly"]

        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        current_hour_str = now.strftime("%Y-%m-%dT%H:00")

        try:
            index = hourly["time"].index(current_hour_str)
            humidity = hourly["relativehumidity_2m"][index]
            weather_code = hourly["weathercode"][index]
        except ValueError:
            humidity = "N/A"
            weather_code = -1

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
        }

        weather_desc = weather_map.get(weather_code, "Tidak diketahui")

        return {
            'weather_desc': weather_desc,
            'temperature': current["temperature"],
            'humidity': humidity,
            'windspeed': current["windspeed"]
        }
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return {
            'weather_desc': 'Tidak tersedia',
            'temperature': 'N/A',
            'humidity': 'N/A',
            'windspeed': 'N/A'
        }
