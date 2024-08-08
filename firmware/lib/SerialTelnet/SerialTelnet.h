#ifndef SERIALTELNET_H
#define SERIALTELNET_H

#include <Arduino.h>
#include <WiFi.h>

class SerialTelnet : public Print {
public:
    SerialTelnet(WiFiClient& client) : telnetClient(client) {}

    size_t write(uint8_t character) override {
        Serial.write(character);
        if (telnetClient && telnetClient.connected()) {
            telnetClient.write(character);
        }
        return 1;
    }

    size_t write(const uint8_t *buffer, size_t size) override {
        Serial.write(buffer, size);
        if (telnetClient && telnetClient.connected()) {
            telnetClient.write(buffer, size);
        }
        return size;
    }

    void setClient(WiFiClient& client) {
        telnetClient = client;
    }

private:
    WiFiClient& telnetClient;
};

#endif // SERIALTELNET_H