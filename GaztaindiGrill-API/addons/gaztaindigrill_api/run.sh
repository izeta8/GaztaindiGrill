#!/usr/bin/with-contenv bashio

echo "----------------------------------------------------"
echo "         Iniciando el Add-on GaztaindiGrill API"
echo "----------------------------------------------------"

# --- Configuración de la BD ---
export DB_HOST=$(bashio::config 'DB_HOST')
export DB_USER=$(bashio::config 'DB_USER')
export DB_PASSWORD=$(bashio::config 'DB_PASSWORD')
export DB_NAME=$(bashio::config 'DB_NAME')

# Mostramos las variables en el log para confirmar
echo "Host de la BD: ${DB_HOST}"
echo "Usuario de la BD: ${DB_USER}"
echo "Nombre de la BD: ${DB_NAME}"

# Iniciamos el servidor FastAPI
echo "Iniciando el servidor FastAPI..."
uvicorn app.main:app --host 0.0.0.0 --port 8000