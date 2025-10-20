import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import joblib
import json

print("Iniciando el proceso de entrenamiento...")

# --- ¡NUEVO! Función de limpieza reutilizable ---
def clean_column(column_series):
    """
    Limpia una serie de pandas convirtiéndola a formato numérico,
    manejando comas y porcentajes.
    """
    series = column_series.astype(str).str.replace(',', '.', regex=False)
    if '%' in series.name:
        series = series.str.replace('%', '', regex=False)
        # Dividir por 100 solo si es un porcentaje
        return pd.to_numeric(series, errors='coerce') / 100.0
    else:
        return pd.to_numeric(series, errors='coerce')

# --- 1. Carga de Datos ---
try:
    df = pd.read_csv('Metricas - Hoja 1.csv', header=3, encoding='utf-8')
    print("✓ Datos cargados correctamente.")
except FileNotFoundError:
    print("Error: No se encontró el archivo 'Metricas - Hoja 1.csv'.")
    exit()

# --- ¡NUEVO! Limpieza de los nombres de las columnas ---
df.columns = df.columns.str.strip()
print("✓ Nombres de columnas limpiados (espacios extra eliminados).")

# --- 2. Preparación y Limpieza de Datos ---
target = 'RESUMEN DE CALIFICACIONES'

# --- ¡NUEVO! Selección de Características Calculables ---
# Usamos todas las columnas que especificaste para alinear con el backend.
features = [
    'Índice de antigüedad',
    'Índice de impacto de revistas',
    '% de citas textuales',
    '% de conectores lógicos',
    '% de parafraseo',
    '% de fuentes utilizadas',
    'Tipo de investigación',
    'Enfoque',
    'Nivel (alcance)',
    'Diseño de investigación',
    'Desarrollo de software',
    'Tecnologías emergentes',
    'Validación de modelos',
    'Marcos de referencias',
    'Validación del producto',
    'Encuestas',
    'Observación / Registro de datos',
    'Entrevistas',
    'Aplicación de pruebas estadísticas',
    'Métricas de rendimiento',
    'Relevantes y aportan a la ciencia y tecnología'
]
print(f"✓ Características seleccionadas para el entrenamiento: {features}")

X = df[features].copy()
y = df[target].copy() # Definimos y con .copy()

print("Iniciando limpieza de datos (comas, porcentajes)...")

# Limpieza de las características (X)
X = X.apply(clean_column)

# --- ¡NUEVO! Limpieza de la variable objetivo (y) ---
# Aplicamos la misma limpieza a la columna de calificaciones
y = clean_column(y)

# Rellenamos cualquier valor nulo en X e y con 0
X = X.fillna(0)
y = y.fillna(0)
print("✓ Datos preparados y limpios (X e y).")

# --- 3. División de Datos y Escalado ---
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"✓ Datos divididos: {len(X_train)} para entrenamiento, {len(X_test)} para prueba.")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test) # Usamos el mismo scaler para los datos de prueba
print("✓ Características escaladas.")

# --- 4. Entrenamiento del Modelo ---
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)
print("✓ Modelo entrenado exitosamente.")

# --- ¡NUEVO! 5. Evaluación del Modelo ---
y_pred = model.predict(X_test_scaled)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse) # Calculamos la raíz cuadrada del MSE
r2 = r2_score(y_test, y_pred)
print("\n--- Resultados de la Evaluación ---")
print(f"Error Cuadrático Medio (MSE): {mse:.4f}")
print(f"Raíz del Error Cuadrático Medio (RMSE): {rmse:.4f}")
print(f"Coeficiente de Determinación (R²): {r2:.4f}")
print("-----------------------------------\n")

# --- ¡NUEVO! 6. Visualización de Importancia de Características ---
print("📊 Generando gráfico de importancia de características...")
importances = model.feature_importances_
feature_importance_df = pd.DataFrame({
    'feature': features,
    'importance': importances
}).sort_values('importance', ascending=False)

plt.figure(figsize=(12, 10))
sns.barplot(x='importance', y='feature', data=feature_importance_df, palette='viridis')
plt.title('Importancia de cada Característica en el Modelo', fontsize=16)
plt.xlabel('Importancia', fontsize=12)
plt.ylabel('Característica', fontsize=12)
plt.tight_layout()
plt.savefig('feature_importance.png')
print("✓ Gráfico de importancia guardado como 'feature_importance.png'")

# --- 5. Guardado del Modelo y el Scaler ---
joblib.dump(model, 'modelo_tesis.pkl')
print("✓ Modelo guardado como 'modelo_tesis.pkl'")
joblib.dump(scaler, 'scaler_tesis.pkl')
print("✓ Scaler guardado como 'scaler_tesis.pkl'")
print("\n¡PROCESO COMPLETADO! ¡FELICIDADES!")

# --- 7. Guardar las columnas utilizadas ---
joblib.dump(features, 'model_columns.pkl')
print("✓ Columnas guardadas como 'model_columns.pkl'")

# Guardar también en JSON para Node.js
with open('model_columns.json', 'w', encoding='utf-8') as f:
    json.dump(features, f, ensure_ascii=False, indent=2)
print("✓ Columnas guardadas como 'model_columns.json'")
