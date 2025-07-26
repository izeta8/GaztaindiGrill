#ifndef GRILL_H
#define GRILL_H

#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <SerialTelnet.h>

#include <GRILL_config.h>
#include <DeviceEncoder.h>
#include <CytronMotorDriver.h>
// #include <Adafruit_MAX31865.h>  
#include <Adafruit_MAX31855.h>

#include <DeviceRotorDrive.h>
 
// Define RNOMINAL and RREF
#define RREF 430.0
#define RNOMINAL 100.0

extern PubSubClient client;

enum Mode {
    NORMAL,
    SPINNING,
    DUAL
};

enum DualModeDirection {
    UPWARDS,
    STILL,
    DOWNWARDS
};

class Grill {
public:
    Grill(int index);

    bool is_at_top_dual;
    bool setup_devices();
    void reset_system();
    bool is_at_top();

    // ----------------- GETTERS ----------------- //
    int get_rotor_encoder_value();
    long get_encoder_real_value();
    long get_encoder_value();
    int  get_temperature();

    // ---------- HOME ASSISTANT UPDATE ---------- //
    void update_rotor_encoder();
    void update_encoder();
    void update_temperature();

    // ---------------- BASICS ----------------- //
    void go_up();
    void go_down();
    void stop_lineal_actuator();

    void turn_around();   
    void rotate_clockwise();
    void rotate_counter_clockwise();
    void stop_rotor();
    bool limit_switch_pressed(const int cs_limit_switch);

    // ------------------- GO_TO ------------------ //
    void go_to(int position);
    void go_to_temp(int temperature);
    void go_to_rotor(int grades);

    DualModeDirection dual_direction;
    Mode mode;

    // ---- HANDLE STOPS (GO_TO / PROGRAM) ---- //
    void handle_rotor_stop();
    void handle_position_stop();
    void handle_temperature_stop();
    void update_program();

    // ------------------- MQTT ------------------- //
    void handle_mqtt_message(const char* topic, const char* payload);
    void execute_program(const char* program);
    void subscribe_to_topics();


private:
    CytronMD* drive;
    DeviceEncoder* encoder;
    DeviceEncoder* rotorEncoder;
    DeviceRotorDrive* rotor;
    Adafruit_MAX31855* thermocouple;

    int index;
    
    // ----------------- LAST VALUES --------------- //
    long lastEncoderValue;
    int lastRotorEncoderValue;
    int lastTemperatureValue;

    // ------------------- RESETS ------------------ //
    void reset_rotor();
    void reset_linear_actuators();
    void reset_encoder(DeviceEncoder* sel_encoder);

    // -------------------- MQTT ------------------- //
    void print(String msg);
    String parse_topic(String action);
    bool publish_mqtt(const String& topic, const String& payload);

    // -------------- GO_TO TARGETS ------------- //
    int targetTemperature;
    int targetDegrees;
    int targetPosition;  

    // ----------------- PROGRAMS ----------------- //
    void cancel_program();
    
    struct Step {
        int time;
        int temperature;
        int position;
        int rotation;
        const char* action;
    };
    Step steps[25]; // The maximum number of steps in a program
    int programStepsCount;
    int programCurrentStep;
    bool targetReached;
    bool cancelProgram; 
    unsigned long stepStartTime;
};

#endif
