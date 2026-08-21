import paho.mqtt.client as mqtt
from .config import MQTT_BROKER, MQTT_PORT, MQTT_USER, MQTT_PASSWORD
import atexit

# Creamos una instancia de cliente única para toda la aplicación
_client = mqtt.Client()

def _on_connect(client, userdata, flags, rc):
    """Callback que se ejecuta al conectar."""
    if rc == 0:
        print("Cliente MQTT (API) conectado exitosamente al Broker.")
    else:
        print(f"Error al conectar al Broker MQTT, código: {rc}")

def connect_mqtt():
    """Conecta el cliente global al broker MQTT."""
    global _client
    _client.on_connect = _on_connect
    try:
        _client.connect(MQTT_BROKER, MQTT_PORT, 60)
        _client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
        
        _client.loop_start() 
        print(f"Iniciando conexión MQTT (API) a {MQTT_BROKER}:{MQTT_PORT}")
    except Exception as e:
        print(f"No se pudo conectar al broker MQTT (API): {e}")

def disconnect_mqtt():
    """Desconecta el cliente MQTT y detiene su hilo."""
    global _client
    if _client.is_connected():
        print("Desconectando cliente MQTT (API)...")
        _client.loop_stop()
        _client.disconnect()

def publish(topic, payload=None, qos=1, retain=False):
    """Publica un mensaje usando el cliente global."""
    global _client
    if not _client.is_connected():
        print("Advertencia: Cliente MQTT (API) no conectado. El mensaje podría no enviarse.")
    
    try:
        _client.publish(topic, payload, qos, retain)
        # print(f"Publicado en {topic}: {payload}") # Descomenta para debug
    except Exception as e:
        print(f"Error al publicar en {topic}: {e}")

# Asegurarse de desconectar al salir
atexit.register(disconnect_mqtt)
