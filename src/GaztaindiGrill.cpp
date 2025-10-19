#include <Arduino.h>  
#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>

#include <GRILL_config.h>
#include <GrillSystem.h>
#include <StatusLED.h>

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
StatusLED statusLed;

// Functions declared from the library, otherwise error.
void connect_to_wifi();
void connect_to_mqtt();
void handle_mqtt_callback(char* topic, byte* payload, unsigned int length);

void setup() {

    Serial.begin(115200);
    SPI.begin();

    // Start status led
    statusLed.begin();

    // WIFI & MQTT connection
    connect_to_wifi();
    client.setCallback(handle_mqtt_callback);
    connect_to_mqtt();
  
    // Initialize GrillSystem
    grillSystem = new GrillSystem();
    if (!grillSystem->initialize_system(&statusLed)) {
        Serial.println("Error initializing grill system");
        statusLed.setState(LedState::ERROR);
        return;
    }
  
}
void loop() {

    // Ensure the WiFi connection.
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi Disconnected. Reconnecting...");
        connect_to_wifi();
        return;
    }

    // Check the MQTT connection.
    if (!client.connected()) {
        Serial.println("MQTT Disconnected. Reconnecting...");
        statusLed.setState(LedState::CONNECTING_MQTT);
        connect_to_mqtt();
    }

    // Essential to maintain the MQTT connection and process messages.
    client.loop(); 
    
    // Here you can uncomment your additional logic.
    grillSystem->update();

    // Update the LED status to show that everything is OK.
    statusLed.update();

    // You can add a small delay to avoid saturating the loop.
    delay(10); 
}

/// -------------------------------- ///
///             MQTT & WIFI          /// 
/// -------------------------------- ///

void connect_to_wifi() {
    Serial.print("Connecting to Wifi...");
    statusLed.setState(LedState::CONNECTING_WIFI);
    WiFi.config(local_IP, gateway, subnet);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        statusLed.update();
    } 
    Serial.println("WiFi connected: " + WiFi.localIP().toString());
}

void connect_to_mqtt() {
    
    client.setServer(mqttServer, mqttPort);
    client.setKeepAlive(8); // Time that will trigger LWT.

    while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        statusLed.update();
        
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

    // Pulse 
    statusLed.pulse(3, CRGB::Green, 250, 250, LedState::OFF);

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