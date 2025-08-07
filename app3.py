from flask import Flask, render_template, request, redirect, url_for, session, Response, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Resource, Api, reqparse, fields, marshal_with, abort
# from people_detector import generate_stream  # Assuming this is a custom module for video streaming
from data_Penjalan import start_mqtt, latest_data   # Assuming this is a custom module for MQTT
from weather import get_weather_data
import mysql.connector
from flask import send_file
import pandas as pd
from io import BytesIO
from flask_mysqldb import MySQL
from datetime import datetime, timedelta

app = Flask(__name__)
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'db_pd'
}

app.secret_key = 'rahasia123'  # untuk session login

# ====================== DUMMY LOGIN (HARDCODED) ======================
USER = {
    "username": "admin",
    "password": "admin123"
}

# ====================== ROUTING WEB ======================
@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        uname = request.form['username']
        pwd = request.form['password']
        if uname == USER['username'] and pwd == USER['password']:
            session['user'] = uname
            return redirect(url_for('index'))
        else:
            return render_template('login2.html', error="Username atau password salah")
    return render_template('login2.html')

@app.route('/index')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/dashboardcam1')
def dashboardcam1():
    if 'user' not in session:
        return redirect(url_for('index'))

    weather = get_weather_data()
    return render_template('dashboardcam1.html', weather=weather)

@app.route('/dashboardcam3')
def dashboardcam3():
    if 'user' not in session:
        return redirect(url_for('index'))

    weather = get_weather_data()
    return render_template('dashboardcam3.html', weather=weather)

@app.route('/rekapcam')
def rekapcam():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('rekapcam.html')

# @app.route('/dashboardcam1')
# def dashboardcam1():
#     if 'user' not in session:
#         return redirect(url_for('index'))

#     # lokasi = request.args.get('lokasi', 'Tidak Diketahui')
#     weather = get_weather_data()
#     return render_template('dashboardcam1.html', weather=weather)

# @app.route('/dashboardcam3')
# def dashboardcam3():
#     if 'user' not in session:
#         return redirect(url_for('index'))

#     # lokasi = request.args.get('lokasi', 'Tidak Diketahui')
#     weather = get_weather_data()
#     return render_template('dashboardnew.html', weather=weather)

@app.route('/api/weather')
def api_weather():
    weather = get_weather_data()
    return jsonify({'weather': weather})


@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))



#======================= STREAMING VIDEO ======================
@app.route('/detect')
def detect():
    return render_template('running.html')

# @app.route('/video_feed')
# def video_feed():
#     return Response(generate_stream(),
#                     mimetype='multipart/x-mixed-replace; boundary=frame')

#========================= status awal ========================
@app.route("/status")
def status():
    return render_template("status.html")
start_mqtt() 
@app.route('/get_status')
def get_status():
    print("Latest data:", latest_data)
    return jsonify({
        "status": latest_data.get("status"),
        "count_middle": latest_data.get("count_middle"),
        "crossing_duration": int(latest_data.get("waktu_crossing") or 0),
    })

# -----------------------
# API: Harian
# -----------------------
@app.route('/api/harian')
def api_harian():
    kamera = request.args.get('kamera', 'CAM1')
    tanggal = request.args.get('tanggal', datetime.now().strftime('%Y-%m-%d'))

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT jam, total_crossing, jam_sibuk, total_durasi 
        FROM rekap_harian 
        WHERE tanggal = %s AND kamera = %s
        ORDER BY jam
    """, (tanggal, kamera))
    rows = cur.fetchall()
    cur.close()

    return jsonify([
        {
            'jam': row[0],  # Bisa 0 dan valid
            'total_crossing': row[1],
            'jam_sibuk': row[2],
            'total_durasi': row[3]
        }
        for row in rows
    ])

# -----------------------
# API: Mingguan
# -----------------------
@app.route('/api/mingguan')
def api_mingguan():
    kamera = request.args.get('kamera', 'CAM1')
    tanggal_str = request.args.get('tanggal', datetime.now().strftime('%Y-%m-%d'))

    try:
        tanggal = datetime.strptime(tanggal_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Format tanggal tidak valid'}), 400

    # Hitung Senin dan Minggu dari minggu itu
    start_week = tanggal - timedelta(days=tanggal.weekday())
    end_week = start_week + timedelta(days=6)

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT hari, total_crossing, jam_tersibuk, total_durasi 
        FROM rekap_summary 
        WHERE tanggal BETWEEN %s AND %s 
          AND tipe_rekap = 'mingguan' 
          AND kamera = %s
        ORDER BY FIELD(hari, 'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')
    """, (start_week.date(), end_week.date(), kamera))
    rows = cur.fetchall()
    cur.close()

    return jsonify([
        {
            'hari': row[0],
            'total_crossing': row[1],
            'jam_tersibuk': row[2] if row[2] is not None else 0,
            'total_durasi': row[3]
        }
        for row in rows
    ])

# -----------------------
# API: Bulanan
# -----------------------
@app.route('/api/bulanan')
def api_bulanan():
    kamera = request.args.get('kamera', 'CAM1')
    bulan = request.args.get('tanggal', datetime.now().strftime('%Y-%m'))

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT tanggal, total_crossing, jam_tersibuk, total_durasi
        FROM rekap_summary
        WHERE DATE_FORMAT(tanggal, '%%Y-%%m') = %s
          AND tipe_rekap = 'bulanan' 
          AND kamera = %s
        ORDER BY tanggal
    """, (bulan, kamera))
    rows = cur.fetchall()
    cur.close()

    return jsonify([
        {
            'tanggal': row[0].strftime('%Y-%m-%d'),
            'total_crossing': row[1],
            'jam_tersibuk': row[2] if row[2] is not None else 0,
            'total_durasi': row[3]
        }
        for row in rows
    ])

# ====================== RUN APP ======================
if __name__ == '__main__':
    app.run(debug=True)
