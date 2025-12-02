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
from sklearn.linear_model import Ridge
from sklearn.ensemble import GradientBoostingRegressor, ExtraTreesRegressor, RandomForestRegressor
from sklearn.pipeline import Pipeline
import importlib
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint, uniform
import time

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
    df['TOTAL'] = df['TOTAL'].astype(str).str.extract(r'(\d+\.?\d*)').astype(float)
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

# modelos a comparar
models = {
    "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
    "Ridge": Pipeline([("scaler", StandardScaler()), ("ridge", Ridge(alpha=1.0))]),
    "GradientBoosting": GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=3, random_state=42),
    "ExtraTrees": ExtraTreesRegressor(n_estimators=200, max_features="sqrt", random_state=42, n_jobs=-1),
}
try:
    xgb_mod = importlib.import_module("xgboost")
    XGBRegressor = getattr(xgb_mod, "XGBRegressor")
    models["XGBoost"] = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42, verbosity=0)
except Exception:
    pass

results = []
for name, mdl in models.items():
    try:
        mdl.fit(X_train, y_train)
        y_pred_tr = mdl.predict(X_train)
        y_pred_ts = mdl.predict(X_test)

        mse_tr = mean_squared_error(y_train, y_pred_tr)
        mse_ts = mean_squared_error(y_test, y_pred_ts)
        rmse_tr = np.sqrt(mse_tr)
        rmse_ts = np.sqrt(mse_ts)
        r2_tr = r2_score(y_train, y_pred_tr)
        r2_ts = r2_score(y_test, y_pred_ts)

        results.append({
            "model": name,
            "mse_train": mse_tr, "mse_test": mse_ts,
            "rmse_train": rmse_tr, "rmse_test": rmse_ts,
            "r2_train": r2_tr, "r2_test": r2_ts
        })

        # Guardar modelo
        joblib.dump(mdl, os.path.join(STATIC_DIR, f"modelo_{name}.pkl"))

        # Generar gráfico individual con los 3 indicadores (MSE, RMSE, R2) comparando train/test
        metrics_names = ["MSE", "RMSE", "R²"]
        train_vals = [mse_tr, rmse_tr, r2_tr]
        test_vals = [mse_ts, rmse_ts, r2_ts]

        plt.figure(figsize=(9,5))
        x = np.arange(len(metrics_names))
        width = 0.35
        bars1 = plt.bar(x - width/2, train_vals, width, label='Entrenamiento', color='steelblue')
        bars2 = plt.bar(x + width/2, test_vals, width, label='Prueba', color='coral')
        plt.xticks(x, metrics_names)
        plt.title(f"Métricas: {name}")
        plt.ylabel("Valor")
        plt.legend()
        # Añadir etiquetas encima de barras
        for b in bars1 + bars2:
            h = b.get_height()
            plt.annotate(f'{h:.3f}', xy=(b.get_x() + b.get_width()/2, h),
                         xytext=(0,3), textcoords="offset points", ha='center', va='bottom', fontsize=8)
        plt.tight_layout()
        plt.savefig(os.path.join(STATIC_DIR, f"metricas_{name}.png"), dpi=300)
        plt.close()

        print(f"{name}: RMSE test={rmse_ts:.4f}, R2 test={r2_ts:.4f}  -> gráfico guardado: metricas_{name}.png")

    except Exception as e:
        print(f"Error entrenando {name}: {e}")

# Guardar comparación general y gráfico de RMSE (test)
df_results = pd.DataFrame(results).sort_values("rmse_test").reset_index(drop=True)
df_results.to_csv(os.path.join(STATIC_DIR, "model_comparison.csv"), index=False)

plt.figure(figsize=(10,6))
plt.bar(df_results['model'], df_results['rmse_test'], color='teal')
plt.ylabel('RMSE (test)')
plt.title('Comparación RMSE (test) por modelo')
plt.xticks(rotation=30, ha='right')
for i, v in enumerate(df_results['rmse_test']):
    plt.annotate(f'{v:.3f}', xy=(i, v), xytext=(0,3), textcoords="offset points", ha='center', fontsize=9)
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "rmse_model_comparison.png"), dpi=200)
plt.close()

# Guardar scaler y columnas para la API (si existen)
try:
    joblib.dump(scaler, os.path.join(STATIC_DIR, "scaler_tesis.pkl"))
except Exception:
    pass
try:
    joblib.dump(list(X_train.columns), os.path.join(STATIC_DIR, "model_columns.pkl"))
except Exception:
    pass

# Guardar mejor modelo por RMSE test con nombre estándar
if not df_results.empty:
    best_name = df_results.iloc[0]['model']
    try:
        best_obj = joblib.load(os.path.join(STATIC_DIR, f"modelo_{best_name}.pkl"))
        joblib.dump(best_obj, os.path.join(STATIC_DIR, f"modelo_mejor_{best_name}.pkl"))
    except Exception:
        pass

# =========================
# 9. AJUSTE DE HIPERPARÁMETROS
# =========================
tune_results = []

# Definir modelos base (usar objetos iguales a los que tienes)
models_to_tune = {
    "RandomForest": RandomForestRegressor(random_state=42, n_jobs=-1),
    "ExtraTrees": ExtraTreesRegressor(random_state=42, n_jobs=-1),
    "GradientBoosting": GradientBoostingRegressor(random_state=42),
    "Ridge": Pipeline([("scaler", StandardScaler()), ("ridge", Ridge(random_state=42))]),
}

# Añadir XGBoost si está disponible
try:
    xgb_mod = importlib.import_module("xgboost")
    XGBRegressor = getattr(xgb_mod, "XGBRegressor")
    models_to_tune["XGBoost"] = XGBRegressor(random_state=42, verbosity=0)
    has_xgb = True
except Exception:
    has_xgb = False

# Parámetros para RandomizedSearchCV
param_distributions = {
    "RandomForest": {
        "n_estimators": [100, 200, 300, 500],
        "max_depth": [None, 5, 10, 15],
        "min_samples_split": [2, 4, 6, 10],
        "min_samples_leaf": [1, 2, 4],
        "max_features": ["sqrt", "log2", 0.5]
    },
    "ExtraTrees": {
        "n_estimators": [100, 200, 300],
        "max_depth": [None, 5, 10],
        "min_samples_split": [2, 4, 6],
        "min_samples_leaf": [1, 2, 4],
        "max_features": ["sqrt", "log2", 0.5]
    },
    "GradientBoosting": {
        "n_estimators": [100, 200, 400],
        "learning_rate": [0.01, 0.05, 0.1],
        "max_depth": [2, 3, 5],
        "subsample": [0.6, 0.8, 1.0]
    },
    "Ridge": {
        "ridge__alpha": [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]
    },
    "XGBoost": {
        "n_estimators": [100,200,400],
        "learning_rate": [0.01, 0.05, 0.1],
        "max_depth": [3,4,6],
        "subsample": [0.6,0.8,1.0],
        "colsample_bytree": [0.6,0.8,1.0]
    }
}

os.makedirs(STATIC_DIR, exist_ok=True)

# Parámetros de búsqueda (ajusta n_iter y cv según tiempos)
N_ITER = 20
CV = 5
for name, estimator in models_to_tune.items():
    print(f"\nTuning {name} ...")
    pd_start = time.time()
    params = param_distributions.get(name, {})
    if not params:
        print(f"No hay parámetros para {name}, se salta.")
        continue

    search = RandomizedSearchCV(
        estimator, params, n_iter=N_ITER, cv=CV,
        scoring="neg_mean_squared_error", n_jobs=-1, random_state=42, verbose=1
    )
    try:
        search.fit(X_train, y_train)
        best = search.best_estimator_
        # predecir y evaluar
        y_pred_tr = best.predict(X_train)
        y_pred_ts = best.predict(X_test)
        mse_tr = mean_squared_error(y_train, y_pred_tr)
        mse_ts = mean_squared_error(y_test, y_pred_ts)
        rmse_tr = mse_tr ** 0.5
        rmse_ts = mse_ts ** 0.5
        r2_tr = r2_score(y_train, y_pred_tr)
        r2_ts = r2_score(y_test, y_pred_ts)

        # guardar mejor modelo
        joblib.dump(best, os.path.join(STATIC_DIR, f"modelo_tuned_{name}.pkl"))

        # gráfico con MSE, RMSE y R2
        import matplotlib.pyplot as plt
        metrics_names = ["MSE", "RMSE", "R²"]
        train_vals = [mse_tr, rmse_tr, r2_tr]
        test_vals = [mse_ts, rmse_ts, r2_ts]
        plt.figure(figsize=(8,4.5))
        x = range(len(metrics_names))
        width = 0.35
        bars1 = plt.bar([i-width/2 for i in x], train_vals, width, label="Entrenamiento", color="steelblue")
        bars2 = plt.bar([i+width/2 for i in x], test_vals, width, label="Prueba", color="coral")
        plt.xticks(x, metrics_names)
        plt.title(f"Métricas ajustadas: {name}")
        plt.legend()
        for b in bars1 + bars2:
            h = b.get_height()
            plt.annotate(f"{h:.3f}", xy=(b.get_x()+b.get_width()/2, h), xytext=(0,3), textcoords="offset points", ha="center", va="bottom", fontsize=8)
        plt.tight_layout()
        plt.savefig(os.path.join(STATIC_DIR, f"metricas_tuned_{name}.png"), dpi=300)
        plt.close()

        tune_results.append({
            "model": name,
            "mse_train": mse_tr, "mse_test": mse_ts,
            "rmse_train": rmse_tr, "rmse_test": rmse_ts,
            "r2_train": r2_tr, "r2_test": r2_ts,
            "best_params": search.best_params_
        })
        print(f"{name} tunado. RMSE test={rmse_ts:.4f}, MSE test={mse_ts:.4f}, tiempo={time.time()-pd_start:.1f}s")
    except Exception as e:
        print(f"Error en tuning {name}: {e}")

# Guardar resumen y gráfico comparativo
if tune_results:
    df_tuned = pd.DataFrame(tune_results).sort_values("rmse_test").reset_index(drop=True)
    df_tuned.to_csv(os.path.join(STATIC_DIR, "model_comparison_tuned.csv"), index=False)

    plt.figure(figsize=(10,6))
    plt.bar(df_tuned['model'], df_tuned['rmse_test'], color='teal')
    plt.ylabel("RMSE (test)")
    plt.title("Comparación RMSE (test) - modelos tunados")
    for i, v in enumerate(df_tuned['rmse_test']):
        plt.annotate(f"{v:.3f}", xy=(i, v), xytext=(0,3), textcoords="offset points", ha="center", fontsize=9)
    plt.tight_layout()
    plt.savefig(os.path.join(STATIC_DIR, "rmse_comparison_tuned.png"), dpi=200)
    plt.close()

# Diagnóstico de posible data leakage / correlaciones con TARGET
import numpy as np

# Asegurar TARGET numérico
df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")

# Convertir features a numérico cuando sea posible (sin sobrescribir strings útiles)
num_df = df[FEATURES].apply(pd.to_numeric, errors="coerce")

# 1) Correlaciones absolutas con TARGET
corr_with_target = num_df.corrwith(df[TARGET]).abs().sort_values(ascending=False)
print("\nTop correlaciones absolutas con TARGET:")
print(corr_with_target.head(20))

# 2) Comprobar si alguna columna es exactamente igual al TARGET (posible copia)
exact_matches = []
for col in FEATURES:
    try:
        # comparar como strings para detectar formatos distintos
        if df[col].astype(str).eq(df[TARGET].astype(str)).all():
            exact_matches.append(col)
        elif df[col].astype(str).eq(df[TARGET].astype(str)).any():
            # si algún valor coincide exactamente
            print(f"Columna {col} tiene coincidencias exactas con TARGET (al menos una).")
    except Exception:
        pass

if exact_matches:
    print("Columnas idénticas a TARGET (borrar/ignorar):", exact_matches)

# 3) Detectar features con correlación muy alta (>0.95) — candidatos a remover
high_corr = corr_with_target[corr_with_target > 0.95].index.tolist()
if high_corr:
    print("Features con correlación >0.95 (candidatas a eliminar):", high_corr)

# 4) Detectar columnas constantes o con muy poca varianza
low_var = [c for c in FEATURES if num_df[c].nunique(dropna=True) <= 1]
if low_var:
    print("Columnas con varianza nula o 1 (eliminar):", low_var)

# Sugerencia automática: eliminar columnas peligrosas antes del split
cols_to_drop = set(high_corr + low_var + exact_matches)
if cols_to_drop:
    print("Se eliminarán temporalmente (antes del split):", cols_to_drop)
    FEATURES = [f for f in FEATURES if f not in cols_to_drop]
    num_df = num_df[FEATURES]

# Guardar un CSV de diagnóstico simple para inspección manual
diag = pd.DataFrame({
    "feature": corr_with_target.index,
    "abs_corr_with_target": corr_with_target.values
}).reset_index(drop=True)
diag.to_csv(os.path.join(STATIC_DIR, "diagnostico_correlaciones.csv"), index=False)

# 5) Ahora hacer split (asegúrate de usar X_train para fit del scaler)
X = num_df[FEATURES].fillna(0)
y = df[TARGET].fillna(0)

from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Comprobar shapes
print("Shapes: X_train, X_test, y_train, y_test ->", X_train.shape, X_test.shape, y_train.shape, y_test.shape)

# 6) Evaluación rápida de Ridge por cross-validation para verificar si surge over-optimistic result
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score

pipe = Pipeline([("scaler", StandardScaler()), ("ridge", Ridge(alpha=1.0, random_state=42))])
cv_scores = cross_val_score(pipe, X_train, y_train, scoring="neg_mean_squared_error", cv=5, n_jobs=-1)
cv_rmse = np.sqrt(-cv_scores)
print("Ridge CV RMSE (folds):", np.round(cv_rmse, 4), "mean:", cv_rmse.mean().round(4))

# 7) Entrenar Ridge y guardar gráfico pred vs real y residuales
pipe.fit(X_train, y_train)
y_pred = pipe.predict(X_test)

import matplotlib.pyplot as plt
plt.figure(figsize=(6,6))
plt.scatter(y_test, y_pred, alpha=0.7)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
plt.xlabel("True TOTAL")
plt.ylabel("Pred TOTAL (Ridge)")
plt.title("Predicción vs Real - Ridge")
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "ridge_pred_vs_true.png"), dpi=200)
plt.close()

resid = y_test - y_pred
plt.figure(figsize=(6,4))
plt.hist(resid, bins=30, color="coral", edgecolor="k")
plt.title("Residuals - Ridge")
plt.tight_layout()
plt.savefig(os.path.join(STATIC_DIR, "ridge_residuals.png"), dpi=200)
plt.close()

# Imprimir métricas finales tras posible limpieza
from sklearn.metrics import mean_squared_error, r2_score
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)
print(f"Ridge post-diagnóstico: MSE test: {mse:.4f}, RMSE test: {rmse:.4f}, R2 test: {r2:.4f}")

import json
import textwrap
import matplotlib.pyplot as plt

# -----------------------------
# Generar resumen diagnóstico detallado + gráficos por puntaje
# -----------------------------
def generar_resumen_diagnostico(df, FEATURES, TARGET, STATIC_DIR, models_dict=None, df_results=None):
    os.makedirs(os.path.join(STATIC_DIR, "diagnostics"), exist_ok=True)
    diag_dir = os.path.join(STATIC_DIR, "diagnostics")

    # 1) Estadísticas generales
    total_stats = {
        "min": float(df[TARGET].min()),
        "max": float(df[TARGET].max()),
        "mean": float(df[TARGET].mean()),
        "std": float(df[TARGET].std()),
        "n_samples": int(len(df))
    }

    # 2) Correlaciones (abs) y top features
    numeric = df[FEATURES].apply(pd.to_numeric, errors="coerce")
    corr = numeric.corrwith(df[TARGET]).fillna(0)
    corr_abs = corr.abs().sort_values(ascending=False)
    top_features = corr_abs.head(20).index.tolist()
    top_corr_df = pd.DataFrame({
        "feature": corr.index,
        "corr": corr.values,
        "abs_corr": corr.abs().values
    }).sort_values("abs_corr", ascending=False)
    top_corr_df.to_csv(os.path.join(diag_dir, "top_feature_correlations.csv"), index=False)

    # 3) Detección de columnas con coincidencias exactas (data leakage)
    n = len(df)
    exact_info = []
    for col in FEATURES:
        try:
            matches = df[col].astype(str).eq(df[TARGET].astype(str))
            pct = matches.sum() / n
            exact_info.append({"feature": col, "pct_match": float(pct), "matches": int(matches.sum())})
        except Exception:
            exact_info.append({"feature": col, "pct_match": 0.0, "matches": 0})
    exact_df = pd.DataFrame(exact_info).sort_values("pct_match", ascending=False)
    exact_df.to_csv(os.path.join(diag_dir, "exact_matches_summary.csv"), index=False)

    # 4) Feature importances / coefficients (si hay modelos)
    model_explanations = {}
    if models_dict:
        for name, mdl in models_dict.items():
            try:
                if hasattr(mdl, "feature_importances_"):
                    imps = mdl.feature_importances_
                    imp_df = pd.DataFrame({"feature": FEATURES, "importance": imps}).sort_values("importance", ascending=False)
                    imp_df.to_csv(os.path.join(diag_dir, f"feature_importances_{name}.csv"), index=False)
                    model_explanations[name] = {
                        "type": "tree",
                        "top_features": imp_df.head(10).to_dict(orient="records")
                    }
                # Pipeline with Ridge
                elif hasattr(mdl, "named_steps") and "ridge" in mdl.named_steps:
                    coef = mdl.named_steps["ridge"].coef_
                    coef_df = pd.DataFrame({"feature": FEATURES, "coef": coef}).sort_values("coef", key=abs, ascending=False)
                    coef_df.to_csv(os.path.join(diag_dir, f"coefficients_{name}.csv"), index=False)
                    model_explanations[name] = {
                        "type": "linear",
                        "top_features": coef_df.head(10).to_dict(orient="records")
                    }
            except Exception:
                continue

    # 5) Resumen por puntaje: para cada valor TARGET con >=2 muestras, guardar gráfico de medias de top features
    score_counts = df[TARGET].value_counts().sort_values(ascending=False)
    scores_to_plot = score_counts[score_counts >= 2].index.tolist()  # al menos 2 muestras
    max_plots = 30
    scores_to_plot = scores_to_plot[:max_plots]

    top_k = 8
    for s in scores_to_plot:
        subset = df[df[TARGET] == s]
        # calcular medias solo para features numéricos y top features por correlación
        sub_num = subset[top_features].apply(pd.to_numeric, errors="coerce")
        means = sub_num.mean().sort_values(ascending=False).head(top_k)
        plt.figure(figsize=(8,4))
        means.plot(kind="bar", color="steelblue")
        plt.title(f"Puntaje {s} (n={len(subset)}): medias de top {top_k} features")
        plt.ylabel("Media")
        plt.tight_layout()
        fn = os.path.join(diag_dir, f"puntaje_{str(s).replace(' ','_')}.png")
        plt.savefig(fn, dpi=200)
        plt.close()

    # 6) Explicaciones automatizadas para el resumen (por modelo y por puntaje)
    lines = []
    lines.append("# Resumen de diagnóstico automático\n")
    lines.append("## Estadísticas generales de la variable TARGET\n")
    lines.append(f"- Mínimo: {total_stats['min']}")
    lines.append(f"- Máximo: {total_stats['max']}")
    lines.append(f"- Media: {total_stats['mean']:.2f}")
    lines.append(f"- Desviación estándar: {total_stats['std']:.2f}")
    lines.append(f"- N muestras: {total_stats['n_samples']}\n")

    lines.append("## Top features por correlación absoluta con TARGET\n")
    for feat, val in corr_abs.head(10).items():
        lines.append(f"- {feat}: correlación {val:.3f}")

    # advertencia de leak si alguna feature supera 1% coincidencias exactas
    suspicious = exact_df[exact_df["pct_match"] >= 0.01]
    if not suspicious.empty:
        lines.append("\n## ALERTA: Posible data leakage\n")
        lines.append("Las siguientes columnas contienen coincidencias exactas con el TARGET en ≥1% de las filas. Se recomienda revisar o eliminar estas columnas antes de entrenar modelos.\n")
        for _, r in suspicious.iterrows():
            lines.append(f"- {r['feature']}: {r['pct_match']*100:.2f}% coincidencias ({r['matches']} filas).")
    else:
        lines.append("\n## Data leakage: no detectado >1% coincidencias exactas.\n")

    # Añadir explicación por modelo
    if df_results is not None:
        lines.append("\n## Resumen por modelo (métricas)\n")
        for _, r in df_results.sort_values("rmse_test").iterrows():
            m = r["model"]
            lines.append(f"- {m}: RMSE test={r['rmse_test']:.3f}, MSE test={r.get('mse_test', float('nan')):.3f}, R² test={r['r2_test']:.4f}")
            # añadir explicación breve
            if r["rmse_test"] > (0.15 * total_stats['std']):  # heurística: RMSE > 15% std -> moderado/alto
                lines.append(f"  - Interpretación: error moderado/alto respecto a la dispersión de los datos.")
            else:
                lines.append(f"  - Interpretación: error bajo respecto a la dispersión de los datos.")

            # si hay explicación de importancia
            if models_dict and m in model_explanations:
                me = model_explanations[m]
                topf = ', '.join([t['feature'] for t in me['top_features'][:5]])
                lines.append(f"  - Features relevantes: {topf}.")

    # Guardar resumen markdown
    resumen_md = "\n".join(lines)
    with open(os.path.join(diag_dir, "resumen_analisis.md"), "w", encoding="utf-8") as f:
        f.write(resumen_md)

    # Guardar también JSON con rutas e índices para UI o inspección
    out = {
        "stats": total_stats,
        "top_features_by_corr": corr_abs.head(20).to_dict(),
        "suspicious_features": suspicious.to_dict(orient="records"),
        "models_summary": (df_results.sort_values("rmse_test").to_dict(orient="records") if df_results is not None else []),
        "plots_by_score": [f"diagnostics/puntaje_{str(s).replace(' ','_')}.png" for s in scores_to_plot]
    }
    with open(os.path.join(diag_dir, "resumen_analisis.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print("Resumen diagnóstico generado en:", diag_dir)
    return diag_dir

# Llamar a la función tras entrenar y tener df_results y models (asegúrate models dict existe)
try:
    # models variable: dict con objetos entrenados (ej. models usado en el entrenamiento)
    diag_dir = generar_resumen_diagnostico(df, FEATURES, TARGET, STATIC_DIR, models_dict=models, df_results=df_results)
except Exception as e:
    print("Error generando resumen diagnóstico:", e)
