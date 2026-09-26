#ifndef GRILL_SENSOR_H
#define GRILL_SENSOR_H

#include <GrillMQTT.h>
#include <HardwareManager.h>
#include <ModeManager.h>
#include <GrillConstants.h>

class GrillSensor {
public:

    GrillSensor(int index, GrillMQTT* mqtt, HardwareManager* hardware, ModeManager* modeManager);

    // ----------------- SENSORS ----------------- //
    int get_rotor_encoder_value();
    long get_encoder_value();
    int  get_temperature();
    bool limit_switch_pressed(const int cs_limit_switch);
    bool is_valid_temperature(int temperature);
    // Only grill 0 is built with a thermocouple.
    bool has_thermocouple();
    // Mean of the last good readings, or -1 while the thermocouple fails or has not answered.
    int  get_average_temperature();
    bool is_at_top();

    // ---------- HOME ASSISTANT UPDATE ---------- //
    void update_rotor_encoder();
    void update_encoder();
    void update_temperature();

    void reset_rotor_encoder();

private:
       
    int grillIndex;
    GrillMQTT* mqtt;
    HardwareManager* hardware;
    ModeManager* modeManager;
    
    // Last values
    long lastEncoderValue;
    int lastRotorEncoderValue;
    int lastPublishedRotorValue;
    unsigned long lastRotorChangeAt;
    bool temperatureError;

    // Ring buffer of the last good readings, filled by update_temperature().
    int temperatureSamples[GrillConstants::TEMPERATURE_AVERAGE_SAMPLES];
    int temperatureSampleCount;
    int temperatureSampleNext;
};

#endif
