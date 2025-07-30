#include <Arduino.h>  
#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>

#include <GRILL_config.h>
#include <Grill.h>

#define NUM_GRILLS 2

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
   
Grill* grills[NUM_GRILLS];

unsigned long previousMillisTemp = 0; 
const long intervalTemp = 1500; // Temperature update pause, MQTT not loading.

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
  
    // Grill instantization & start
    for (int i = 0; i < NUM_GRILLS; ++i) {
        grills[i] = new Grill(i);
        if (grills[i]->setup_devices()) {
            Serial.println("The grill " + String(i) + " has been configured correctly");
            // grills[i]->reset_system();
            // grills[i]->subscribe_to_topics();

        } else {
            Serial.println("An error has occurred while configuring the devices of grill " + String(i));
        }
    } 
    
}

void loop() {

    if (!client.connected()) {
        connect_to_mqtt();
    }
    client.loop();  
 
    /// ----------------------------------- ///
    ///          HANDLE DUAL MODE          /// 
    /// ----------------------------------- ///

    if (grills[0]-> mode == DUAL)
    {

        // ------------- AT TOP ------------- //
        bool is_at_top_dual = grills[0]->is_at_top() && grills[1]->is_at_top();
        grills[0]->is_at_top_dual = is_at_top_dual;

        // ------------- DIRECTIONS ------------- //
        switch (grills[0]->dual_direction) {
            case UPWARDS:
                grills[0]->go_up();
                grills[1]->go_up();
                break;
            case STILL:
                grills[0]->stop_lineal_actuator();
                grills[1]->stop_lineal_actuator();
                break;
            case DOWNWARDS:
                grills[0]->go_down();
                grills[1]->go_down();
                break;
        }
    }
      
    // ---- ROTOR ---- //
    
    // Only the left grill has a rotor
    grills[0]->handle_rotor_stop();
    grills[0]->update_rotor_encoder();   
    
    for (int i = 0; i < NUM_GRILLS; ++i) 
    {
        /// ------------------------------------------------- ///
        ///       HANDLE THE STOP OF GO_TO AND PROGRAMS       /// 
        /// ------------------------------------------------- ///

        grills[i]->handle_position_stop(); 
        grills[i]->update_program();    
    
        /// ---------------------------------------------- ///
        ///          UPDATE HOME ASSISTANTEKO STATES       /// 
        /// ---------------------------------------------- ///

        grills[i]->update_encoder(); 
    }

    // ---- TEMPERATURE ---- //

    // grills[0]->handle_temperature_stop(); 
     
    // // Temperatura irakutzeko pausa, MQTT ez kargatzeko.
    // unsigned long currentMillisTemp = millis();
    // if (currentMillisTemp - previousMillisTemp >= intervalTemp) {
    //     // Guardar el tiempo actual
    //     grills[0]->update_temperature(); // Kontuan euki ezkerreko parrillak bakarrik eukikoula pt100
    // }   
      
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
    while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        if (client.connect("ESP32Client", mqttUser, mqttPassword)) {
            Serial.println("connected");
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
    if (id >= 0 && id < NUM_GRILLS) {
        grills[id]->mqtt->handle_mqtt_message(action, message);
    }
}