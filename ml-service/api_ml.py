from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)
print("🚀 Iniciando servidor Flask de predicción...")

# --- 1️⃣ CARGA DEL MODELO, SCALER Y COLUMNAS ---
try:
    model = joblib.load('modelo_tesis.pkl')
    scaler = joblib.load('scaler_tesis.pkl')
    model_columns = joblib.load('model_columns.pkl')

    print(f"✓ Modelo y scaler cargados correctamente. Total de columnas esperadas: {len(model_columns)}")

except FileNotFoundError as e:
    print(f"❌ Error: No se encontró un archivo de modelo necesario ({e.filename}).")
    print("   Asegúrate de ejecutar 'train_model.py' primero.")
    print(str(e))
    model = None
    scaler = None
    model_columns = []


# --- 2️⃣ ENDPOINT DE PREDICCIÓN ---
@app.route('/predict', methods=['POST'])
def predict():
    if model is None or scaler is None:
        return jsonify({'error': 'Modelo o scaler no cargado. Reentrena con train_model.py.'}), 500

    try:
        json_data = request.get_json()

        if not json_data:
            return jsonify({'error': 'No se recibieron datos JSON válidos.'}), 400

        print("📩 Datos recibidos para predicción:")
        print(json_data)

        # Creamos DataFrame con las columnas esperadas
        query = pd.DataFrame([json_data])

        # --- LIMPIEZA Y FORMATEO (idéntico a train_model.py) ---
        for col in model_columns:
            if col in query.columns:
                # Convertimos a numérico, los datos ya vienen limpios desde el backend
                query[col] = pd.to_numeric(query[col], errors='coerce')
            else:
                # Si la columna esperada no viene en el JSON, la añadimos con 0
                query[col] = 0

        # Rellenamos nulos y aseguramos el orden de las columnas
        query = query.fillna(0)[model_columns]

        # Escalado
        query_scaled = scaler.transform(query)

        # Predicción
        prediction = model.predict(query_scaled)
        pred_value = float(prediction[0])

        print(f"🎯 Predicción generada: {pred_value:.4f}")

        return jsonify({
            'calificacion_predicha': round(pred_value, 4),
            'mensaje': 'Predicción generada correctamente'
        })

    except Exception as e:
        print(f"❌ Error en /predict: {str(e)}")
        return jsonify({'error': str(e)}), 400


# --- 3️⃣ EJECUCIÓN DEL SERVIDOR ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
