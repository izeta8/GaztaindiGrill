#!/usr/bin/with-contenv bashio

echo "----------------------------------------------------"
echo "         Iniciando el Add-on GaztaindiGrill API"
echo "----------------------------------------------------"

# --- Configuración de la BD ---
export DB_HOST=$(bashio::config 'DB_HOST')
export DB_USER=$(bashio::config 'DB_USER')
export DB_PASSWORD=$(bashio::config 'DB_PASSWORD')
export DB_NAME=$(bashio::config 'DB_NAME')

# --- AÑADE ESTAS LÍNEAS PARA MQTT ---
export MQTT_BROKER=$(bashio::config 'MQTT_BROKER')
export MQTT_PORT=$(bashio::config 'MQTT_PORT')
export MQTT_USER=$(bashio::config 'MQTT_USER')
export MQTT_PASSWORD=$(bashio::config 'MQTT_PASSWORD')
# --- FIN DE LAS LÍNEAS A AÑADIR ---


# Mostramos las variables en el log para confirmar
echo "Host de la BD: ${DB_HOST}"
echo "Usuario de la BD: ${DB_USER}"
echo "Nombre de la BD: ${DB_NAME}"
# --- AÑADE ESTAS LÍNEAS TAMBIÉN ---
echo "Broker MQTT: ${MQTT_BROKER}"
echo "Puerto MQTT: ${MQTT_PORT}"

# Iniciamos el servidor FastAPI
echo "Iniciando el servidor FastAPI..."
uvicorn app.main:app --host 0.0.0.0 --port 8000