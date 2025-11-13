import os
import pandas as pd
import numpy as np
import json
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# =========================
# RUTAS
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "Static")
os.makedirs(STATIC_DIR, exist_ok=True)

# =========================
# 1. CARGA DEL CSV
# =========================
FILE_PATH = os.path.join(BASE_DIR, "Metricas - Hoja 1.csv")
print("Leyendo:", FILE_PATH)
df = pd.read_csv(FILE_PATH, header=None)

forced_cols = [
    "N°",
    "Universidad",
    "Tesis",
    "Índice de antigüedad",
    "Índice de impacto de revistas",
    "% de citas textuales",
    "% de conectores lógicos",
    "% de parafraseo",
    "% de fuentes utilizadas",
    "Tipo de investigación",
    "Enfoque",
    "Nivel (alcance)",
    "Diseño de investigación",
    "Desarrollo de software",
    "Tecnologías emergentes",
    "Validación de modelos",
    "Marcos de referencias",
    "Validación del producto",
    "Encuestas",
    "Observación / Registro de datos",
    "Entrevistas",
    "Aplicación de pruebas estadísticas",
    "Métricas de rendimiento",
    "Relevantes y aportan a la ciencia y tecnología",
    "TOTAL",
]

df = df.iloc[:, :len(forced_cols)]
df.columns = forced_cols

print("Columnas forzadas:")
for c in df.columns:
    print(" -", c)

# =========================
# 2. FEATURES / TARGET
# =========================
FEATURES = [
    "Validación del producto",
    "Observación / Registro de datos",
    "Aplicación de pruebas estadísticas",
    "Enfoque",
    "Tecnologías emergentes",
    "Métricas de rendimiento",
    "Desarrollo de software",
    "Entrevistas",
    "Marcos de referencias",
    "Tipo de investigación",
    "Encuestas",
    "Diseño de investigación",
    "Validación de modelos",
    "Índice de antigüedad",
    "% de fuentes utilizadas",
    "Nivel (alcance)",
    "% de conectores lógicos",
    "% de parafraseo",
    "Índice de impacto de revistas",
    "% de citas textuales",
    "Relevantes y aportan a la ciencia y tecnología",
]
TARGET = "TOTAL"

# Después de cargar el DataFrame y antes de las estadísticas, agregar:
def clean_total_column(df):
    # Extraer solo los números de la columna TOTAL
    df['TOTAL'] = df['TOTAL'].astype(str).str.extract('(\d+\.?\d*)').astype(float)
    return df

# Limpiar los datos
df = clean_total_column(df)

# Ahora sí calcular las estadísticas
print("\nEstadísticas de TOTAL:")
print(f"Mínimo: {df[TARGET].min():.2f}")
print(f"Máximo: {df[TARGET].max():.2f}")
print(f"Media: {df[TARGET].mean():.2f}")
print(f"Desviación estándar: {df[TARGET].std():.2f}")

def clean_column(s: pd.Series) -> pd.Series:
    s = s.astype(str).str.replace(",", ".", regex=False)
    if s.str.contains("%").any():
        s = s.str.replace("%", "", regex=False)
        s = pd.to_numeric(s, errors="coerce") / 100.0
    else:
        s = pd.to_numeric(s, errors="coerce")
    return s.fillna(0)

for col in FEATURES + [TARGET]:
    df[col] = clean_column(df[col])

X = df[FEATURES]
y = df[TARGET]

# =========================
# 3. ESCALADO + SPLIT
# =========================
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# =========================
# 4. MODELO
# =========================
model = RandomForestRegressor(
    n_estimators=500,           # Aumentar árboles
    max_depth=15,              # Ajustar profundidad
    min_samples_split=4,       
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# =========================
# 5. MÉTRICAS
# =========================
y_pred_test = model.predict(X_test)
rmse_test = mean_squared_error(y_test, y_pred_test) ** 0.5
r2_test = r2_score(y_test, y_pred_test)

y_pred_train = model.predict(X_train)
rmse_train = mean_squared_error(y_train, y_pred_train) ** 0.5
r2_train = r2_score(y_train, y_pred_train)

# Calcular métricas
mse_train = mean_squared_error(y_train, y_pred_train)
mse_test = mean_squared_error(y_test, y_pred_test)
rmse_train = np.sqrt(mse_train)
rmse_test = np.sqrt(mse_test)
r2_train = r2_score(y_train, y_pred_train)
r2_test = r2_score(y_test, y_pred_test)

# Imprimir resultados
print(f"MSE train: {mse_train:.4f}")
print(f"MSE test: {mse_test:.4f}")
print(f"RMSE train: {rmse_train:.4f}")
print(f"RMSE test: {rmse_test:.4f}")
print(f"R² train: {r2_train:.4f}")
print(f"R² test: {r2_test:.4f}")

# =========================
# 5 bis. CURVA TRAIN / VALIDATION
# =========================
train_curve = []
val_curve = []
steps = []

for i in range(1, len(model.estimators_) + 1):
    sub_estimators = model.estimators_[:i]

    # promedio de las predicciones de los i árboles
    y_pred_train_i = sum(est.predict(X_train) for est in sub_estimators) / i
    y_pred_test_i = sum(est.predict(X_test) for est in sub_estimators) / i

    rmse_tr_i = mean_squared_error(y_train, y_pred_train_i) ** 0.5
    rmse_te_i = mean_squared_error(y_test, y_pred_test_i) ** 0.5

    train_curve.append(rmse_tr_i)
    val_curve.append(rmse_te_i)
    steps.append(i)

plt.figure(figsize=(6, 5))
plt.plot(steps, train_curve, label="train", color="steelblue")
plt.plot(steps, val_curve, label="validation", color="coral")
plt.axvline(x=max(steps) * 0.5, linestyle="--", color="red", alpha=0.4)
plt.xlabel("nº de árboles (iteraciones)")
plt.ylabel("RMSE")
plt.title("Curvas de entrenamiento (RandomForest)")
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "train_validation_curve.png"), dpi=300)
plt.close()

# =========================
# 6. GRÁFICOS
# =========================
# 6.1 Importancia
fi = model.feature_importances_
fi_df = pd.DataFrame({"Característica": FEATURES, "Importancia": fi}).sort_values(
    "Importancia", ascending=False
)
plt.figure(figsize=(10, 8))
sns.barplot(x="Importancia", y="Característica", data=fi_df)
plt.title("Importancia de características (RandomForest)")
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "feature_importance.png"), dpi=300)
plt.close()

# 6.2 Real vs Predicho (test)
plt.figure(figsize=(6, 6))
plt.scatter(y_test, y_pred_test, alpha=0.6, label='Test')
mn, mx = min(y_test.min(), y_pred_test.min()), max(y_test.max(), y_pred_test.max())
plt.plot([mn, mx], [mn, mx], "r--", label="Ideal")
plt.xlabel("Real (TOTAL)")
plt.ylabel("Predicho (TOTAL)")
plt.title(f"Predicción vs Real (test)\nRMSE={rmse_test:.2f} | R2={r2_test:.2f}")
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "prediction_test.png"), dpi=300)
plt.close()

# 6.3 Train vs Test juntos
plt.figure(figsize=(6, 6))
plt.scatter(y_train, y_pred_train, alpha=0.4, label='Train')
plt.scatter(y_test, y_pred_test, alpha=0.6, label='Test')
mn2 = min(y.min(), y_pred_train.min(), y_pred_test.min())
mx2 = max(y.max(), y_pred_train.max(), y_pred_test.max())
plt.plot([mn2, mx2], [mn2, mx2], "k--", label="Ideal")
plt.xlabel("Real (TOTAL)")
plt.ylabel("Predicho (TOTAL)")
plt.title("Train vs Test (misma escala)")
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "train_vs_test.png"), dpi=300)
plt.close()

# =========================
# 7. ERRORES
# =========================
errors_df = pd.DataFrame({
    "y_test": y_test.values,
    "y_pred_test": y_pred_test,
    "abs_error": np.abs(y_test.values - y_pred_test)
})
errors_df.to_csv(os.path.join(STATIC_DIR, "errors_test.csv"), index=False, encoding="utf-8")

# =========================
# 7.5 Gráficos de métricas de evaluación 
plt.figure(figsize=(15, 5))

# MSE
plt.subplot(131)
mse_train = mean_squared_error(y_train, y_pred_train)
mse_test = mean_squared_error(y_test, y_pred_test)
plt.bar(['Entrenamiento', 'Prueba'], [mse_train, mse_test], color=['steelblue', 'coral'])
plt.title('Error Cuadrático Medio\n(MSE)')
plt.ylabel('MSE')
plt.grid(True, alpha=0.3)

# RMSE
plt.subplot(132)
plt.bar(['Entrenamiento', 'Prueba'], [rmse_train, rmse_test], color=['steelblue', 'coral'])
plt.title('Raíz del Error Cuadrático Medio\n(RMSE)') 
plt.ylabel('RMSE')
plt.grid(True, alpha=0.3)

# R²
plt.subplot(133)
plt.bar(['Entrenamiento', 'Prueba'], [r2_train, r2_test], color=['steelblue', 'coral'])
plt.title('Coeficiente de Determinación\n(R²)')
plt.ylabel('R²')
plt.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "metricas_evaluacion.png"), dpi=300)
plt.close()

# =========================
# 8. ARTEFACTOS
# =========================
joblib.dump(model, os.path.join(STATIC_DIR, "modelo_tesis.pkl"))
joblib.dump(scaler, os.path.join(STATIC_DIR, "scaler_tesis.pkl"))
joblib.dump(FEATURES, os.path.join(STATIC_DIR, "model_columns.pkl"))

with open(os.path.join(STATIC_DIR, "model_columns.json"), "w", encoding="utf-8") as f:
    json.dump(FEATURES, f, ensure_ascii=False, indent=2)

metrics_payload = {
    "rmse_train": rmse_train,
    "r2_train": r2_train,
    "rmse_test": rmse_test,
    "r2_test": r2_test,
    "n_total": int(len(df)),
    "n_train": int(len(y_train)),
    "n_test": int(len(y_test))
}
with open(os.path.join(STATIC_DIR, "metrics.json"), "w", encoding="utf-8") as f:
    json.dump(metrics_payload, f, ensure_ascii=False, indent=2)

print("Entrenamiento COMPLETO.")
print("Gráficos guardados en:", STATIC_DIR)
