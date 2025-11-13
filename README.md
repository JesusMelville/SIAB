# Sistema de Análisis Bibliométrico

Este proyecto es un sistema integral diseñado para analizar tesis académicas en formato PDF. La aplicación extrae texto, calcula una serie de indicadores bibliométricos, predice una calificación de calidad utilizando un modelo de Machine Learning y presenta al usuario un desglose detallado, estadísticas y recomendaciones de mejora.

## Arquitectura del Sistema

El sistema sigue una arquitectura de microservicios, compuesta por dos componentes principales que se comunican entre sí:

1.  **Backend (Node.js)**:
    *   **Framework**: Express.js
    *   **Base de Datos**: MongoDB (a través de Mongoose)
    *   **Responsabilidades**:
        *   Gestionar la API REST para usuarios, autenticación (JWT) y tesis.
        *   Manejar la subida y el procesamiento inicial de archivos PDF.
        *   Calcular indicadores bibliométricos a partir del texto extraído.
        *   Comunicarse con el servicio de ML para obtener predicciones.
        *   Almacenar los resultados y métricas en la base de datos.

2.  **Servicio de Machine Learning (Python)**:
    *   **Framework**: Flask
    *   **Librerías Principales**: Scikit-learn, Pandas, Joblib
    *   **Responsabilidades**:
        *   Exponer un endpoint (`/predict`) que recibe los indicadores calculados por el backend.
        *   Cargar un modelo de `RandomForestRegressor` pre-entrenado y un `StandardScaler`.
        *   Preprocesar los datos de entrada, realizar la predicción y devolver la calificación de calidad.

## Estructura del Directorio

```
/Sistema de analisis bibliometrico
├── /bibliometrico-backend/   # Servicio del backend en Node.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   ├── .env.example          # Archivo de ejemplo para variables de entorno
│   ├── package.json
│   └── server.js
│
├── /ml-service/              # Servicio de predicción en Python
│   ├── api_ml.py             # API de Flask
│   ├── modelo_tesis.pkl      # Modelo de ML
│   ├── scaler_tesis.pkl      # Scaler para los datos
│   ├── model_columns.pkl     # Columnas del modelo
│   ├── train_model.py        # Script de entrenamiento (opcional)
│   └── requirements.txt      # Dependencias de Python
│
└── README.md                 # Este archivo
```

## Requisitos Previos

Asegúrate de tener instalado el siguiente software en tu sistema:

*   Node.js (v16 o superior)
*   Python (v3.9 o superior)
*   MongoDB (o una cuenta en MongoDB Atlas)
*   `pip` y `venv` para Python.

## Instalación y Puesta en Marcha

Sigue estos pasos para configurar y ejecutar el proyecto localmente.

### 1. Configurar el Backend (Node.js)

```bash
# 1. Navega al directorio del backend
cd bibliometrico-backend

# 2. Instala las dependencias de Node.js
npm install

# 3. Crea un archivo .env a partir del ejemplo
# (Copia y pega el contenido de .env.example a un nuevo archivo .env)
# y rellena las variables:
# MONGO_URI=tu_string_de_conexion_a_mongodb
# JWT_SECRET=un_secreto_muy_fuerte_para_jwt
# ML_API_URL=http://127.0.0.1:5000/predict
```

### 2. Configurar el Servicio de ML (Python)

```bash
# 1. Desde la raíz del proyecto, navega al directorio del servicio de ML
cd ../ml-service  # o `cd ml-service` si estás en la raíz

# 2. Crea y activa un entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instala las dependencias de Python
pip install -r requirements.txt
```

### 3. Ejecutar el Sistema

Debes tener dos terminales abiertas, una para cada servicio.

*   **Terminal 1 (Backend):**
    ```bash
    # Dentro de la carpeta /bibliometrico-backend
    npm run dev
    ```
    El servidor de Node.js se iniciará (generalmente en el puerto 3000 o el que hayas configurado).

*   **Terminal 2 (Servicio ML):**
    ```bash
    # Dentro de la carpeta /ml-service y con el entorno virtual activado
    python api_ml.py
    ```
    El servidor de Flask se iniciará en `http://0.0.0.0:5000`.

¡Listo! El sistema completo ya está en funcionamiento y listo para recibir peticiones desde el frontend.
