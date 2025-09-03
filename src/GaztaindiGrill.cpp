#include <Arduino.h>  
#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>

#include <GRILL_config.h>
#include <GrillSystem.h>

const char* ssid = "Gaztaindi";
const char* password = "Gaztaindi"; 
const IPAddress local_IP(192, 168, 1, 100);
const IPAddress gateway(192, 168, 1, 1);
const IPAddress subnet(255, 255, 255, 0);  

const char* mqttServer = "192.168.1.76"; 
const int mqttPort = 1883;  
const char* mqttUser = "gaztaindi";
const char* mqttPassword = "gaztaindi";

WiFiClient wifiClient;
PubSubClient client(wifiClient);
   
GrillSystem* grillSystem;

// Functions declared from the library, otherwise error.
void connect_to_wifi();
void connect_to_mqtt();
void handle_mqtt_callback(char* topic, byte* payload, unsigned int length);

void setup() {

    Serial.begin(115200);
    SPI.begin();

    // WIFI & MQTT connection
    connect_to_wifi();
    client.setCallback(handle_mqtt_callback);
    connect_to_mqtt();
  
    // Initialize GrillSystem
    grillSystem = new GrillSystem();
    if (!grillSystem->initialize_system()) {
        Serial.println("Error initializing grill system");
        return;
    }
    
}

void loop() {

    if (!client.connected()) {
        connect_to_mqtt();
    }
    client.loop();  
 
    // All grill logic is now encapsulated in GrillSystem
    grillSystem->update();
      
} 


/// -------------------------------- ///
///             MQTT & WIFI          /// 
/// -------------------------------- ///

void connect_to_wifi() {
    WiFi.config(local_IP, gateway, subnet);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    } 
    Serial.println("WiFi connected: " + WiFi.localIP().toString());
}

void connect_to_mqtt() {
    
    client.setServer(mqttServer, mqttPort);
    client.setKeepAlive(8); // Time that will trigger LWT.

    while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        
        // LWT configuration
        const char* willTopic   = "grill/status";
        const char* willMessage = "offline";
        int willQoS             = 1;
        bool willRetain         = true;

        if (client.connect(
            "ESP32Client",      // clientID
            mqttUser, mqttPassword,
            willTopic, willQoS, willRetain, willMessage
        )) {
            
            Serial.println("connected to mqtt");
            client.publish("grill/status", "online", true);
            
        } else {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

void handle_mqtt_callback(char* topic, byte* payload, unsigned int length) {
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';

    // Get the action and its corresponding grill taking into account the topic format is "grill/{id}/{action}"
    int id;
    char action[120]; // An MQTT topic cant be longer than the size of the array.
    sscanf(topic, "grill/%d/%s", &id, action);

    // Verify that the id is valid before using it
    if (id >= 0 && id < GrillConstants::NUM_GRILLS) {
        Grill* grill = grillSystem->get_grill(id);
        if (grill) {
            grill->handle_mqtt_message(action, message);
        }
    }
}