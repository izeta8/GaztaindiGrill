#include <Arduino.h>  
#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoOTA.h>

#include <GRILL_config.h>
#include <Grill.h>
#include <SerialTelnet.h>

#define NUM_GRILLS 2

const char* ssid = "WiFi-Gaztaindi";
const char* password = ""; 
const IPAddress local_IP(192, 168, 1, 100);
const IPAddress gateway(192, 168, 1, 1);
const IPAddress subnet(255, 255, 255, 0);  

const char* mqttServer = "192.168.1.62"; 
const int mqttPort = 1883;  
const char* mqttUser = "gaztaindi";
const char* mqttPassword = "gaztaindi";

WiFiClient wifiClient;
PubSubClient client(wifiClient);
   
WiFiServer telnetServer(23);  // Puerto Telnet
WiFiClient telnetClient;
SerialTelnet SerialTN(telnetClient);
    
Grill* grills[NUM_GRILLS];

unsigned long previousMillisTemp = 0; 
const long intervalTemp = 1500; // Temperaturan estadua aktualizatzeko pausa, MQTT ez kargatzeko.

// Funtziyuak lenuotik deklaratu, bestela erroria emateu.
void connectToWiFi();
void connectToMQTT();
void handleMQTTCallback(char* topic, byte* payload, unsigned int length);
bool publicarMQTT(const String& topic, const String& payload);
void configurarOTA();
void manejarTelnet();

void setup() {

    Serial.begin(115200);
    SPI.begin();

    // WIFI eta MQTTa konektatu
    connectToWiFi();
    client.setCallback(handleMQTTCallback);
    connectToMQTT();

    // Configuración de Telnet
    telnetServer.begin();
    telnetServer.setNoDelay(true); 

    // OTA konfiguratu
    configurarOTA();
  
    // Parrillak instantziatu eta martxan jarri
    for (int i = 0; i < NUM_GRILLS; ++i) {
        grills[i] = new Grill(i);
        if (grills[i]->setup_devices()) {
            SerialTN.println("Los dispositivos de la parrilla " + String(i) + " se han configurado correctamente");
            grills[i]->resetear_sistema();
            grills[i]->subscribe_topics();

        } else {
            SerialTN.println("Ha habido un error al configurar los dispositivos de la parrilla " + String(i));
        }
    } 
    
    // Manejar telnet
    manejarTelnet();
}

void loop() {

    if (!client.connected()) {
        connectToMQTT();
    }
    client.loop();  
 
    /// ----------------------------------- ///
    ///          MANEJAR MODO DUAL          /// 
    /// ----------------------------------- ///

    if (grills[0]-> modo == DUAL)
    {

        // ------------- ESTA ARRIBA ------------- //
        bool esta_arriba_dual = grills[0]->esta_arriba() && grills[1]->esta_arriba();
        grills[0]->esta_arriba_dual = esta_arriba_dual;

        // ------------- DIRECCIONES ------------- //
        DireccionDual direccion_dual = grills[0]->direccion_dual;
        if (direccion_dual == ARRIBA)
        {
            grills[0]->subir();
            grills[1]->subir();
        }
        if (direccion_dual == QUIETO)
        {
            grills[0]->parar();
            grills[1]->parar();
        }
        if (direccion_dual == ABAJO)
        {
            grills[0]->bajar();
            grills[1]->bajar();
        }
    }
      
    // ---- ROTOR ---- //
    // Ezkerreko parrillak bakarrik daka rotorra
    grills[0]->manejar_parada_rotor();
    grills[0]->update_rotor_encoder();   
    
    for (int i = 0; i < NUM_GRILLS; ++i) 
    {
        /// --------------------------------- ///
        ///       MANEJAR LAS PARADAS DE      /// 
        ///        LOS GO_TO / PROGRAMA       /// 
        /// --------------------------------- ///

        grills[i]->manejar_parada_encoder(); 
        grills[i]->update_programa();    
    
        /// -------------------------------- ///
        ///          HOME ASSISTANTEKO       /// 
        ///        ESTADUAK AKTUALIZATU      /// 
        /// -------------------------------- ///

        grills[i]->update_encoder(); 
    }

    // ---- TEMPERATURA ---- //

    // grills[0]->manejar_parada_temperatura(); 
     
    // Temperatura irakutzeko pausa, MQTT ez kargatzeko.
    unsigned long currentMillisTemp = millis();
    if (currentMillisTemp - previousMillisTemp >= intervalTemp) {
        // Guardar el tiempo actual
        grills[0]->update_temperature(); // Kontuan euki ezkerreko parrillak bakarrik eukikoula pt100
    }   
      
    // Manejar actualizaciones OTA
    ArduinoOTA.handle(); 

    // Manejar Telnet
    manejarTelnet();
    
} 


/// -------------------------------- ///
///             MQTT & WIFI          /// 
/// -------------------------------- ///

void connectToWiFi() {
    WiFi.config(local_IP, gateway, subnet);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    } 
    SerialTN.println("WiFi connected: " + WiFi.localIP().toString());
}

void connectToMQTT() {
    client.setServer(mqttServer, mqttPort);
    while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        if (client.connect("ESP32Client", mqttUser, mqttPassword)) {
            SerialTN.println("connected");
        } else {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            SerialTN.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

bool publicarMQTT(const String& topic, const String& payload) {
    if (!client.connected()) {
        connectToMQTT();
    }
    return client.publish(topic.c_str(), payload.c_str());
}

void handleMQTTCallback(char* topic, byte* payload, unsigned int length) {
    char mensaje[length + 1];
    memcpy(mensaje, payload, length);
    mensaje[length] = '\0';

    // Akziyua, eta akziyua dagokion parrilla atea, formatua hau dala kontuan izanda: "grill/{id}/{accion}" 
    int id;
    char accion[120]; // MQTT topic batek ezin du array honen dimentsiyua baño handiyo izan.
    sscanf(topic, "grill/%d/%s", &id, accion);

    // Verificar que el id es válido antes de usarlo
    if (id >= 0 && id < NUM_GRILLS) {
        grills[id]->handleMQTTMessage(accion, mensaje);
    }
}
 

/// -------------------------------- ///
///            OTA & TELNET          /// 
/// -------------------------------- /// 
  
void configurarOTA()  
{ 
    // Configuración de ArduinoOTA
    ArduinoOTA.setHostname("GaztaindiGrill");
    // ArduinoOTA.setPassword("gaztaindi"); // Opcional: añade una contraseña para mayor seguridad

    ArduinoOTA.onStart([]() {
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH)
            type = "sketch";
        else // U_SPIFFS
            type = "filesystem";
        // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
        SerialTN.println("Start updating " + type);
    });
    ArduinoOTA.onEnd([]() {
        SerialTN.println("\nEnd");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) SerialTN.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) SerialTN.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) SerialTN.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) SerialTN.println("Receive Failed");
        else if (error == OTA_END_ERROR) SerialTN.println("End Failed");
    });

    ArduinoOTA.begin();
}    
 
 
void manejarTelnet()
{ 
    // Manejar Telnet
    if (telnetServer.hasClient()) {
        if (!telnetClient || !telnetClient.connected()) {
            if (telnetClient) telnetClient.stop();
            telnetClient = telnetServer.available();
                SerialTN.println("Cliente Telnet conectado");  // Mensaje de depuración
        } else {
            telnetServer.available().stop();
        }
    } 
     
    if (telnetClient && telnetClient.connected()) {
        while (telnetClient.available()) {
            Serial.write(telnetClient.read());
        }
        if (Serial.available()) {
            telnetClient.write(Serial.read());
        }
    }
}