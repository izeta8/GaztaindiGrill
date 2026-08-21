# Imagen base correcta para aarch64 con Python 3.13
FROM ghcr.io/home-assistant/aarch64-base-python:3.13-alpine3.20

# Creamos y establecemos el directorio de trabajo
WORKDIR /usr/src/app

# Copiamos el archivo de requisitos e instalamos los paquetes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código de nuestra aplicación
COPY ./app ./app

# Copiamos el script de inicio y le damos permisos de ejecución
COPY run.sh /
RUN chmod a+x /run.sh

# Exponemos el puerto de la API
EXPOSE 8000

# Definimos el comando para iniciar el script
CMD [ "/run.sh" ]