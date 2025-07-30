#ifndef GRILL_MQTT_H
#define GRILL_MQTT_H

#include <PubSubClient.h>
extern PubSubClient client;

class GrillMQTT {
public:
    GrillMQTT(int index);

    void handle_mqtt_message(const char* topic, const char* payload);
    void subscribe_to_topics();
    void print(String msg);
    String parse_topic(String action);
    bool publish_message(const String& topic, const String& payload);

private:

    int grillIndex;

};

#endif
