# Resumen de diagnóstico automático

## Estadísticas generales de la variable TARGET

- Mínimo: 0.0
- Máximo: 86.0
- Media: 65.41
- Desviación estándar: 14.69
- N muestras: 150

## Top features por correlación absoluta con TARGET

- Validación del producto: correlación 0.730
- Métricas de rendimiento: correlación 0.707
- Observación / Registro de datos: correlación 0.642
- Desarrollo de software: correlación 0.538
- Marcos de referencias: correlación 0.518
- Aplicación de pruebas estadísticas: correlación 0.506
- Enfoque: correlación 0.457
- Tipo de investigación: correlación 0.428
- Tecnologías emergentes: correlación 0.370
- Índice de antigüedad: correlación 0.363

## Data leakage: no detectado >1% coincidencias exactas.


## Resumen por modelo (métricas)

- Ridge: RMSE test=0.201, MSE test=0.040, R² test=0.9998
  - Interpretación: error bajo respecto a la dispersión de los datos.
  - Features relevantes: Observación / Registro de datos, Métricas de rendimiento, Tecnologías emergentes, Aplicación de pruebas estadísticas, Validación del producto.
- GradientBoosting: RMSE test=1.903, MSE test=3.621, R² test=0.9791
  - Interpretación: error bajo respecto a la dispersión de los datos.
  - Features relevantes: Validación del producto, Observación / Registro de datos, Métricas de rendimiento, Tecnologías emergentes, Aplicación de pruebas estadísticas.
- ExtraTrees: RMSE test=2.438, MSE test=5.946, R² test=0.9657
  - Interpretación: error moderado/alto respecto a la dispersión de los datos.
  - Features relevantes: Observación / Registro de datos, Validación del producto, Métricas de rendimiento, Aplicación de pruebas estadísticas, Marcos de referencias.
- RandomForest: RMSE test=2.482, MSE test=6.158, R² test=0.9645
  - Interpretación: error moderado/alto respecto a la dispersión de los datos.
  - Features relevantes: Validación del producto, Observación / Registro de datos, Métricas de rendimiento, Tecnologías emergentes, Aplicación de pruebas estadísticas.