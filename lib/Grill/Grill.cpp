#include <Arduino.h>
#include <GRILL_config.h>
#include <ArduinoJson.h>

#include <Grill.h>

extern PubSubClient client;

#define ENCODER_ERROR -9999.0 // Define a special value that represents a bad read from the encoder.
#define NO_TARGET -999 // Define a special value that represents when there is no objective in go_to

Grill::Grill(int index) :
    index(index), 
    encoder(nullptr), rotorEncoder(nullptr), drive(nullptr), rotor(nullptr), thermocouple(nullptr), // PERIPHERALS
    lastEncoderValue(0), lastRotorEncoderValue(0), lastTemperatureValue(0), // LAST VALUES
    dual_direction(STILL), mode(NORMAL), is_at_top_dual(false), // DATA
    targetPosition(NO_TARGET), targetDegrees(NO_TARGET), targetTemperature(NO_TARGET), // GO_TO TARGETS
    programStepsCount(0), programCurrentStep(0), targetReached(false), stepStartTime(0), cancelProgram(false) // PROGRAM
    {}

bool Grill::setup_devices() {
   
    print("Configuring devices for grill " + String(index));

    // ENCODER
    encoder = new DeviceEncoder(PIN_SPI_CS_GRILL_ENC[index]);
    if (!encoder->begin(PULSES_ENCODER_GRILL, DATA_INTERVAL_GRILL, false)) {
        print("Error Begin Encoder " + String(index));
        return false;
    }
    
    // LINEAL ACTUATOR
    drive = new CytronMD(PWM_DIR, PIN_GRILL_PWM[index], PIN_GRILL_DIR[index]);

    // LINEAL ACTUATOR LIMIT SWITCH (RESET)
    pinMode(PIN_CS_LIMIT_LINEAL[index], INPUT_PULLUP);
    
    // ROTOR LIMIT SWITCH (RESET)
    pinMode(PIN_CS_LIMIT_ROTOR, INPUT_PULLUP);
    
    // ROTOR AND PT100 (LEFT SIDE ONLY)
    if (index == 0)
    {
        // Rotor
        rotor = new DeviceRotorDrive(PIN_EN3, PIN_EN4, PIN_ENB);
        
        // Rotor Encoder
        rotorEncoder = new DeviceEncoder(PIN_SPI_CS_ROTOR_ENC);
        if (!rotorEncoder->begin(PULSES_ENCODER_ROTOR, DATA_INTERVAL_ROTOR, true)) {
            print("Error Begin Rotor Encoder");
            return false;
        }

        // Thermocouple
        // pinMode(PIN_SPI_CS_GRILL_PT, OUTPUT);
        // digitalWrite(PIN_SPI_CS_GRILL_PT, HIGH);
        // thermocouple = new Adafruit_MAX31855(PIN_SPI_SCK, PIN_SPI_CS_GRILL_PT, PIN_SPI_MISO);
        // SPI.beginTransaction((SPISettings(1000000, MSBFIRST, SPI_MODE0))); // Use SPI settings
        // if (!thermocouple->begin()) {
        //     print("Error Begin Thermocouple");
        //     return false;
        // }
    }

    return true;
}

void Grill::reset_system() {
    
    print("Resetting devices for grill " + String(index));   

    // ------------- RESET ROTOR ------------- //
    if (index == 0)
    {
        // reset_rotor(); 
    }

    // ------------- RESET LINEAL ACTUATOR ------------- //
    reset_linear_actuators();
    
    // ------------- RESET ENCODER ------------- //
    reset_encoder(encoder);
    update_encoder();

    print("Devices reset");  
    
}

/// -------------------------- ///
///          GET/PRINT         /// 
///         PERIPHERALS        /// 
/// -------------------------- ///

// ------------- ROTOR ENCODER ------------- //
 
int Grill::get_rotor_encoder_value()
{  
    int rotorEncoderValue = rotorEncoder->get_data();
     
    if (rotorEncoderValue<0) { rotorEncoderValue+=360; }  
    if (rotorEncoderValue == 0) return lastRotorEncoderValue;
 
    return rotorEncoderValue;
}

void Grill::update_rotor_encoder() { 

    int rotorEncoderValue = get_rotor_encoder_value();
    
    if (rotorEncoderValue == lastRotorEncoderValue) { return; }
    lastRotorEncoderValue = rotorEncoderValue;

    // Only prints every 5th value.
    if (rotorEncoderValue % 5 == 0)
    {
        Serial.println("Rotor Encoder = " + String(rotorEncoderValue));
        publish_mqtt(parse_topic("inclinacion"), String(rotorEncoderValue));
    }
}

// ------------- ENCODER ------------- //

long Grill::get_encoder_real_value() {
    long encoderValue = encoder->get_data();

    if (encoderValue < 0) encoderValue = 1;
    if (encoderValue > 100) encoderValue = 100;
    if (encoderValue == 0) encoderValue = ENCODER_ERROR;

    return encoderValue;
}

long Grill::get_encoder_value() {
    return encoder->get_data();
}

void Grill::update_encoder() {
    long encoderValue = get_encoder_real_value();
    if (encoderValue == ENCODER_ERROR || encoderValue == lastEncoderValue) { return; }
    lastEncoderValue = encoderValue;

    String encoderValueStr = String(encoderValue);
    String stringTopicEncoder = parse_topic("posicion");
    Serial.println("Encoder " + String(index) + " = " + encoderValue);
    publish_mqtt(stringTopicEncoder, encoderValueStr);
}

// ------------- PT 100 ------------- //

int Grill::get_temperature() {
    double temperature = thermocouple->readCelsius();
    if (isnan(temperature)) {
        print("Error reading temperature!");
        return -1;
    }
    return (int) temperature;
}

void Grill::update_temperature() {
    int temperature = get_temperature();
    if (temperature == lastTemperatureValue || temperature < 0) { return; }
    lastTemperatureValue = temperature;

    String temperatureStr = String(temperature);
    Serial.println("Temperature = " + temperatureStr);
    publish_mqtt(parse_topic("temperatura"), temperatureStr);
}
 
/// -------------------------///
///           LINEAL         /// 
///          ACTUATOR        /// 
/// -------------------------///

void Grill::go_up() {
    if (mode == DUAL)
    {
        dual_direction = UPWARDS;
    } else 
    {
        drive->setSpeed(-255);
    }
}

void Grill::go_down() {
    if (mode == DUAL)
    {
        dual_direction = DOWNWARDS;
    } else 
    {
        drive->setSpeed(255);
    }
}

void Grill::stop_lineal_actuator() {
    if (mode == DUAL)
    {
        dual_direction = STILL;
    } else 
    {
        drive->setSpeed(0);
    }
}

void Grill::turn_around() {
    print("Turning around");
    int currentInclination = get_rotor_encoder_value();
    int targetInclination = (currentInclination + 180) % 360;
    go_to_rotor(targetInclination);
}

/// -------------------------///
///            ROTOR         /// 
/// -------------------------///

void Grill::rotate_clockwise()
{
    rotor->rotate_clockwise();
}

void Grill::rotate_counter_clockwise()
{
    rotor->rotate_counter_clockwise();
}

void Grill::stop_rotor()
{
    rotor->stop();
}

/// -------------------------- ///
///            GO TOs          /// 
/// -------------------------- ///

// ------------- ROTOR ------------- //

void Grill::go_to_rotor(int degrees) {

    if (degrees < 0 || degrees >= 360) {
        print("Rotor degrees out of range");
        return;
    }  
     
    int currentRotorPosition = get_rotor_encoder_value();
    targetDegrees = degrees;
     
    int differenceRight = (targetDegrees - currentRotorPosition + 360) % 360;
    int differenceLeft = (currentRotorPosition - targetDegrees + 360) % 360;
     
    // In the handle_rotor_stop() function that is called in loop, we handle when we have to stop
    if (differenceRight < differenceLeft) 
    {
        rotate_counter_clockwise();
    } else 
    {
        rotate_clockwise();
    }
}

void Grill::handle_rotor_stop() {
    
    int currentRotorPosition = get_rotor_encoder_value();
    int margin = 3;

    if (abs(currentRotorPosition-targetDegrees) <= margin && targetDegrees != NO_TARGET ) { 
        stop_rotor();
        targetDegrees = NO_TARGET;
        targetReached = true; // Mark that the step is in progress after reaching the position
        stepStartTime = millis(); // Start counting time now
    } 
}

// ------------- LINEAL ACTUATOR ------------- //

void Grill::go_to(int position) {

    if (position < 0) position = 0;
    if (position > 100) position = 99;
    
    targetPosition = position;
    int currentPercentage = get_encoder_real_value();

    // In the function handle_temperature_stop(), which is called in loop, we handle when we have to stop.
    if (currentPercentage < position) {
        go_up();
    } else if (currentPercentage > position) {
        go_down();
    }
}

void Grill::handle_position_stop() {
    int currentPercentage = get_encoder_real_value();
    int margin = 2;

    if (abs(currentPercentage - targetPosition) <= margin && targetPosition != NO_TARGET ) {
        stop_lineal_actuator();
        targetPosition = NO_TARGET;
        targetReached = true; // Marks that the step is in progress after reaching the position
        stepStartTime = millis(); // Start counting time now
    } 
}

// ------------- PT100 ------------- //

bool is_valid_temperature(int temp) 
{
    return (temp != -1);
} 

void Grill::go_to_temp(int temperature) {

    targetTemperature = temperature;
    int currentTemperature = get_temperature();

    // If the temperature is not valid, we exit the method
    if (!is_valid_temperature(currentTemperature)) {return;}

    // In the function handle_temperature_stop(), which is called in loop, we handle when we have to stop.
    if (currentTemperature < targetTemperature) {
        go_up();
    } else if (currentTemperature > targetTemperature) {
        go_down();
    }
}

void Grill::handle_temperature_stop() {

    int currentTemperature = get_temperature();
    int margin = 2; // Adjust the margin as needed
 
    // If the temperature is not valid, we exit the method
    if (!is_valid_temperature(currentTemperature)) {return;}

    if (abs(currentTemperature - targetTemperature) <= margin && targetTemperature != NO_TARGET ) {
        stop_lineal_actuator();
        targetTemperature = NO_TARGET;
        targetReached = true; // Mark that the step is in progress after reaching the temperature
        stepStartTime = millis(); // Start counting time now
    } 
}

/// ------------------------------------  ///
///         PERIPHERALS EXTRA FUNC        /// 
/// ------------------------------------  ///

bool Grill::is_at_top()
{   
    return (mode == DUAL) ? is_at_top_dual : limit_switch_pressed(PIN_CS_LIMIT_LINEAL[index]);
}

void Grill::reset_rotor()
{
    print("Resetting rotor");
    rotate_clockwise();

    // To avoid printing the message all the time, make a non-blocking delay so it can receive MQTT
    unsigned long previousMessageMillis = 0;
    const long messageInterval = 1000;
    
    while (!limit_switch_pressed(PIN_CS_LIMIT_ROTOR)) {
        unsigned long currentMillis = millis();
        if (currentMillis - previousMessageMillis >= messageInterval) {
            previousMessageMillis = currentMillis;
            print("Resetting rotor...");
        }
        client.loop();
    }

    stop_rotor();
    rotorEncoder->reset_counter(0);
}

void Grill::reset_linear_actuators()
{
    go_up(); 
    print("Moving linear actuators to top");

    // To avoid printing the message all the time, make a non-blocking delay so it can receive MQTT
    unsigned long previousMessageMillis = 0;
    const long messageInterval = 1000;

    while (!is_at_top()) {

        unsigned long currentMillis = millis();
        if (currentMillis - previousMessageMillis >= messageInterval) {
            previousMessageMillis = currentMillis;
            print("Moving linear actuators to top...");
        }
        client.loop();
    }

    print("Linear actuators at top");
    stop_lineal_actuator();
}

void Grill::reset_encoder(DeviceEncoder* selected_encoder) {
    selected_encoder->reset_counter(PULSES_ENCODER_GRILL);
}

bool Grill::limit_switch_pressed(const int CS_LIMIT_SWITCH) {
    return digitalRead(CS_LIMIT_SWITCH) == LOW;
}

/// ----------------------///
///          MQTT         /// 
/// ----------------------///

void Grill::print(String msg) {
    Serial.print("[");
    Serial.print(this->index);
    Serial.print("] ");
    Serial.println(msg);
    publish_mqtt(parse_topic("log"), msg);
}

bool Grill::publish_mqtt(const String& topic, const String& payload) {
    if (!client.connected()) {
        extern void connect_to_mqtt();
        connect_to_mqtt();
    }
    return client.publish(topic.c_str(), payload.c_str());
}

String Grill::parse_topic(String action) {
    return "grill/" + String(index) + "/" + action;
}

void Grill::subscribe_to_topics() {
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

void Grill::handle_mqtt_message(const char* pAction, const char* pPayload) {
    String action(pAction);
    String payload(pPayload);

    String topic = parse_topic("mqtt_topic_listener");
    String message = "An action has reached. " + action + ": " + payload;
    publish_mqtt(topic, message);

    if (action == "dirigir") {
        if (payload == "subir") {
            go_up();
        } else if (payload == "bajar") {
            go_down();
        } else if (payload == "parar") {
            stop_lineal_actuator();
        }
    }  

     if (action == "inclinar") {
        if (payload == "horario") {
            rotate_clockwise();
        } else if (payload == "antihorario") {
            rotate_counter_clockwise();
        } else if (payload == "parar") {
            stop_rotor();
        }
    }  

    if (action == "establecer_posicion") {
        int posicion = payload.toInt();
        go_to(posicion);
    }
    
    if (action == "reiniciar") {
        print("Reiniciando sistema");
    }
    
    if (action == "ejecutar_programa") {
        print("Ejecutando un programa..."); 
        execute_program(pPayload);
    }
    
    if (action == "cancel_program") {
        cancelProgram = true;
        print("Programa cancelado");
    }
    
    if (action == "establecer_inclinacion")
    {
        int grades = payload.toInt();
        go_to_rotor(grades);
    }
    
    if (action == "establecer_modo")
    {
        if (payload == "normal")
        {
            mode = NORMAL;
            stop_lineal_actuator();
            reset_rotor();
        }
        
        if (payload == "burruntzi") 
        {
            mode = SPINNING;
            stop_lineal_actuator();
            stop_rotor();
        }
        
        if (payload == "dual")
        {
            // The dual mode is controller in the main function from src/GaztaindiGrill.cpp
            mode = DUAL;
        }
    }
}

void Grill::execute_program(const char* program) { 
     
    // Cancel any previous program.
    cancel_program();  

    StaticJsonDocument<5000> doc;
    DeserializationError error = deserializeJson(doc, program);

    if (error) {
        print("Error deserializing JSON.");
        return;
    }
    
    print("JSON deserialized successfully.");
    serializeJson(doc, Serial);

    JsonArray array = doc.as<JsonArray>();
    programStepsCount = array.size(); 
    
    for (int i = 0; i < programStepsCount; i++) {
        JsonObject step = array[i];
        if (step.containsKey("time") && step.containsKey("temperature")) {
            steps[i] = {step["time"], step["temperature"], -1, -1};
        } else if (step.containsKey("time") && step.containsKey("position")) {
            steps[i] = {step["time"], -1, step["position"], -1};
        } else if (step.containsKey("time") && step.containsKey("rotation")) {
            steps[i] = {step["time"], -1, -1, step["rotation"]};
        } 
    }

    // Initialize state variables
    programCurrentStep = 0;
    targetReached = false;
    stepStartTime = millis();
    cancelProgram = false;
}

void Grill::cancel_program()
{
    stop_lineal_actuator();  
    targetDegrees = NO_TARGET;
    targetPosition = NO_TARGET;
    targetTemperature = NO_TARGET;
    programStepsCount = 0;
    programCurrentStep = 0;
    cancelProgram = false;
    targetReached = false;
    stepStartTime = 0;

    print("Program cancelled and system restarted."); 

}

void Grill::update_program() {
     
    if (cancelProgram) {
        cancel_program();
        return;
    }

    if (programCurrentStep >= programStepsCount) {
        return;
    }

    Step& step = steps[programCurrentStep];
    
    if (!targetReached) {
        if (step.temperature != -1) {
            go_to_temp(step.temperature);
            return; // Exit the function to wait until the temperature reaches
        } else if (step.position != -1) {
            go_to(step.position);
            return; // Exit the function to wait until the position reaches
        } else if (step.rotation != -1) {
            go_to_rotor(step.rotation);
            return; // Exit the function to wait until the rotation reaches
        }
    } else {
        unsigned long stepElapsedTime = millis() - stepStartTime;
        int time = step.time;

        if (stepElapsedTime >= time * 1000) {
            targetReached = false;
            programCurrentStep++;
        }
    }
}
