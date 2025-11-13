# api_ml.py
import os
from flask import Flask, request, jsonify, send_from_directory
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
STATIC_DIR = os.path.join(BASE_DIR, "Static")

app = Flask(__name__, static_folder=STATIC_DIR)

# cargar artefactos desde Static
try:
    model = joblib.load(os.path.join(STATIC_DIR, "modelo_tesis.pkl"))
    scaler = joblib.load(os.path.join(STATIC_DIR, "scaler_tesis.pkl"))
    model_columns = joblib.load(os.path.join(STATIC_DIR, "model_columns.pkl"))
    print("Modelo y scaler cargados desde Static.")
except Exception as e:
    print("ERROR cargando artefactos:", e)
    model = None
    scaler = None
    model_columns = []

def clean_value(col_name, value):
    if value is None:
        return 0
    v = str(value).replace(",", ".")
    if "%" in col_name:
        v = v.replace("%", "")
        return pd.to_numeric(v, errors="coerce") / 100.0
    return pd.to_numeric(v, errors="coerce")

@app.route("/predict", methods=["POST"])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Modelo no cargado"}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON vacío"}), 400

    extra = set(data.keys()) - set(model_columns)
    if extra:
        print("Campos no usados:", extra)

    row = {}
    for col in model_columns:
        if col in data:
            row[col] = clean_value(col, data[col])
        else:
            row[col] = 0

    df = pd.DataFrame([row])[model_columns].fillna(0)
    df_scaled = scaler.transform(df)
    pred = float(model.predict(df_scaled)[0])

    return jsonify({
        "calificacion_predicha": round(pred, 4),
        "cols_usadas": model_columns
    })

@app.route("/plots/<filename>", methods=["GET"])
def get_plot(filename):
    return send_from_directory(STATIC_DIR, filename, as_attachment=False)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
