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

app = Flask(__name__)
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'pd_fix'
}

app.secret_key = 'rahasia123'  # untuk session login
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# db = SQLAlchemy(app)
# api = Api(app)

# # ====================== MODEL ======================
# class UserModel(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(80), unique=True, nullable=False)
#     email = db.Column(db.String(80), unique=True, nullable=False)

#     def __repr__(self):
#         return f"User(name={self.name}, email={self.email})"

# with app.app_context():
#     db.create_all()



# ====================== PARSER ======================
# user_args = reqparse.RequestParser()
# user_args.add_argument('name', type=str, required=True, help="Name cannot be blank!")
# user_args.add_argument('email', type=str, required=True, help="Email cannot be blank!")

# userFields = {
#     'id': fields.Integer,
#     'name': fields.String,
#     'email': fields.String
# }

# ====================== API RESOURCES ======================
# class Users(Resource):
#     @marshal_with(userFields)
#     def get(self):
#         users = UserModel.query.all()
#         return users

#     @marshal_with(userFields)
#     def post(self):
#         args = user_args.parse_args()
#         user = UserModel(name=args["name"], email=args["email"])
#         db.session.add(user)
#         db.session.commit()
#         return UserModel.query.all(), 201

# class User(Resource):
#     @marshal_with(userFields)
#     def get(self, id):
#         user = UserModel.query.filter_by(id=id).first()
#         if not user:
#             abort(404, "User Not Found")
#         return user

#     @marshal_with(userFields)
#     def patch(self, id):
#         args = user_args.parse_args()
#         user = UserModel.query.filter_by(id=id).first()
#         if not user:
#             abort(404, "User Not Found")
#         user.name = args["name"]
#         user.email = args["email"]
#         db.session.commit()
#         return user

#     @marshal_with(userFields)
#     def delete(self, id):
#         user = UserModel.query.filter_by(id=id).first()
#         if not user:
#             abort(404, "User Not Found")
#         db.session.delete(user)
#         db.session.commit()
#         return UserModel.query.all(), 200

# api.add_resource(Users, '/api/users/')
# api.add_resource(User, '/api/users/<int:id>')

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
            return redirect(url_for('dashboard'))
        else:
            return render_template('login2.html', error="Username atau password salah")
    return render_template('login2.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    weather = get_weather_data() 
    return render_template('dashboardnew.html' , weather=weather)

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

@app.route('/rekap', methods=['GET'])
def rekap():
    mode = request.args.get('mode', 'harian')  # default: harian

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    if mode == 'harian':
        query = "SELECT * FROM rekap_harian ORDER BY tanggal DESC, jam DESC"
        label = "Rekap Hari Ini"
    elif mode == 'mingguan':
        query = "SELECT * FROM rekap_mingguan ORDER BY tanggal DESC"
        label = "Rekap Mingguan"
    elif mode == 'bulanan':
        query = "SELECT * FROM rekap_bulanan ORDER BY tanggal DESC"
        label = "Rekap Bulanan"
    else:
        query = ""
        label = "Tidak valid"
    
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return render_template("rekap.html", mode=mode, label=label, data=data)

@app.route('/download_excel')
def download_excel():
    mode = request.args.get('mode', 'harian')

    if mode == 'harian':
        data = get_harian()
    elif mode == 'mingguan':
        data = get_mingguan()
    else:
        data = get_bulanan()

    # Buat DataFrame dari data
    df = pd.DataFrame(data)

    # Simpan ke Excel di memory
    output = BytesIO()
    writer = pd.ExcelWriter(output, engine='xlsxwriter')
    df.to_excel(writer, index=False, sheet_name='Rekap')
    writer.close()
    output.seek(0)

    return send_file(output,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     download_name=f"rekap_{mode}.xlsx",
                     as_attachment=True)

def get_harian():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rekap_harian ORDER BY tanggal DESC, jam DESC")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

def get_mingguan():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rekap_mingguan ORDER BY tanggal DESC")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

def get_bulanan():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rekap_bulanan ORDER BY tanggal DESC")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

# ====================== RUN APP ======================
if __name__ == '__main__':
    app.run(debug=True)
