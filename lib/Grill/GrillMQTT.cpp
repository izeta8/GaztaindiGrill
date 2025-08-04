
#include <GrillMQTT.h>

extern PubSubClient client;

GrillMQTT::GrillMQTT(int index) : grillIndex(index) { }

void GrillMQTT::subscribe_to_topics() {

    if (!client.connected()) {
        Serial.println("MQTT client is not connected. Cannot subscribe to topics.");
        return;
    }

    const char* topics[] = {
        GrillConstants::TOPIC_LOG,
        GrillConstants::TOPIC_REINICIAR,
        GrillConstants::TOPIC_DIRIGIR,
        GrillConstants::TOPIC_INCLINAR,
        GrillConstants::TOPIC_ESTABLECER_POSICION,
        GrillConstants::TOPIC_EJECUTAR_PROGRAMA,
        GrillConstants::TOPIC_CANCELAR_PROGRAMA,
        GrillConstants::TOPIC_ESTABLECER_INCLINACION,
        GrillConstants::TOPIC_ESTABLECER_MODO
    };

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
