# api_ml.py
import os
from flask import Flask, request, jsonify, send_from_directory
import joblib
import pandas as pd
import glob

BASE_DIR = os.path.dirname(__file__)
STATIC_DIR = os.path.join(BASE_DIR, "Static")

app = Flask(__name__, static_folder=STATIC_DIR)

# cargar artefactos desde Static
models = {}
model_metrics = pd.DataFrame()
try:
    # cargar scaler y columnas como ya tenías
    scaler = joblib.load(os.path.join(STATIC_DIR, "scaler_tesis.pkl"))
    model_columns = joblib.load(os.path.join(STATIC_DIR, "model_columns.pkl"))
    # cargar todos los modelos guardados modelo_*.pkl
    for p in glob.glob(os.path.join(STATIC_DIR, "modelo_*.pkl")):
        name = os.path.basename(p).replace("modelo_","").replace(".pkl","")
        try:
            models[name] = joblib.load(p)
        except Exception:
            pass
    # cargar CSV de métricas si existe
    mc_path = os.path.join(STATIC_DIR, "model_comparison.csv")
    if os.path.exists(mc_path):
        model_metrics = pd.read_csv(mc_path)
    print("Artefactos cargados desde Static. Modelos:", list(models.keys()))
except Exception as e:
    print("ERROR cargando artefactos:", e)

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
    if not models or scaler is None:
        return jsonify({"error":"Modelos no disponibles. Ejecutar train_model primero."}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error":"JSON vacío"}), 400

    # permitir seleccionar modelo con "model" en el payload (ej: {"model":"RandomForest", ...features...})
    model_name = data.pop("model", None) or (next(iter(models.keys())) if models else None)
    if model_name not in models:
        return jsonify({"error":f"Modelo '{model_name}' no disponible", "available": list(models.keys())}), 400

    # validar columnas extra
    extra = set(data.keys()) - set(model_columns)
    if extra:
        return jsonify({"error":"Columnas desconocidas", "extra": list(extra)}), 400

    row = {col: clean_value(col, data.get(col, 0)) for col in model_columns}
    df_row = pd.DataFrame([row])[model_columns].fillna(0)
    X = scaler.transform(df_row)

    pred = models[model_name].predict(X).tolist()
    # obtener métricas precomputadas para ese modelo (si existen)
    metrics = {}
    if not model_metrics.empty:
        r = model_metrics[model_metrics['model']==model_name]
        if not r.empty:
            metrics = r.iloc[0].to_dict()

    return jsonify({"model": model_name, "prediction": pred[0], "metrics": metrics})

@app.route("/plots/<filename>", methods=["GET"])
def get_plot(filename):
    return send_from_directory(STATIC_DIR, filename, as_attachment=False)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
