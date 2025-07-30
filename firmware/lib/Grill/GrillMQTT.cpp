
#include <GrillMQTT.h>

extern PubSubClient client;

GrillMQTT::GrillMQTT(int index) : grillIndex(index) { }

void GrillMQTT::handle_mqtt_message(const char* pAction, const char* pPayload) {
    String action(pAction);
    String payload(pPayload);

    String topic = parse_topic("mqtt_topic_listener");
    String message = "An action has reached. " + action + ": " + payload;
    publish_message(topic, message);

    if (action == "dirigir") {
        if (payload == "subir") {
            // go_up();
        } else if (payload == "bajar") {
            // go_down();
        } else if (payload == "parar") {
            // stop_lineal_actuator();
        }
    }  

     if (action == "inclinar") {
        if (payload == "horario") {
            // rotate_clockwise();
        } else if (payload == "antihorario") {
            // rotate_counter_clockwise();
        } else if (payload == "parar") {
            // stop_rotor();
        }
    }  

    if (action == "establecer_posicion") {
        int posicion = payload.toInt();
        // go_to(posicion);
    }
    
    if (action == "reiniciar") {
        print("Reiniciando sistema");
    }
    
    if (action == "ejecutar_programa") {
        print("Ejecutando un programa..."); 
        // execute_program(pPayload);
    }
    
    if (action == "cancel_program") {
        // cancelProgram = true;
        print("Programa cancelado");
    }
    
    if (action == "establecer_inclinacion")
    {
        int grades = payload.toInt();
        // go_to_rotor(grades);
    }
    
    if (action == "establecer_modo")
    {
        if (payload == "normal")
        {
            // mode = NORMAL;
            // stop_lineal_actuator();
            // reset_rotor();
        }
        
        if (payload == "burruntzi") 
        {
            // mode = SPINNING;
            // stop_lineal_actuator();
            // stop_rotor();
        }
        
        if (payload == "dual")
        {
            // // The dual mode is controller in the main function from src/GaztaindiGrill.cpp
            // mode = DUAL;
        }
    }
}

void GrillMQTT::subscribe_to_topics() {

    if (!client.connected()) {
        Serial.println("MQTT client is not connected. Cannot subscribe to topics.");
        return;
    }

    const char* topics[] = {"log", "reiniciar", "dirigir", "inclinar", "establecer_posicion", "ejecutar_programa", "cancelar_programa", "establecer_inclinacion", "establecer_modo"};
    const int numTopics = sizeof(topics) / sizeof(topics[0]);

    for (int i = 0; i < numTopics; ++i) {
        String topic = parse_topic(topics[i]);
        if (client.subscribe(topic.c_str())) {
            Serial.println("Subscribed to: " + topic);
        } else {
            Serial.println("Failed to subscribe to: " + topic);
        }
    }
}

void GrillMQTT::print(String msg) {
    Serial.print("[");
    Serial.print(this->grillIndex);
    Serial.print("] ");
    Serial.println(msg);
    publish_message(parse_topic("log"), msg);
}

String GrillMQTT::parse_topic(String action) {
    return "grill/" + String(grillIndex) + "/" + action;
}

bool GrillMQTT::publish_message(const String& topic, const String& payload) {
    if (!client.connected()) {
        extern void connect_to_mqtt();
        connect_to_mqtt();
    }
    return client.publish(topic.c_str(), payload.c_str());
}
