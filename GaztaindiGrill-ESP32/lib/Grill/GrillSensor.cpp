
#include <GrillSensor.h>

GrillSensor::GrillSensor(int index, GrillMQTT* mqtt, HardwareManager* hardware, ModeManager* modeManager):
    grillIndex(index), mqtt(mqtt), hardware(hardware), modeManager(modeManager),
    lastEncoderValue(GrillConstants::ENCODER_ERROR), lastRotorEncoderValue(0),
    lastPublishedRotorValue(GrillConstants::NO_TARGET), lastRotorChangeAt(0), temperatureError(false),
    temperatureSampleCount(0), temperatureSampleNext(0) {}


// ------------- ENCODER ------------- //

long GrillSensor::get_encoder_value() {
    if (!hardware->encoder->is_connected()) { return GrillConstants::ENCODER_ERROR; }

    long encoderValue = hardware->encoder->get_data();

    if (encoderValue < 0) encoderValue = 0;
    if (encoderValue > 100) encoderValue = 100;

    return encoderValue;
}

void GrillSensor::update_encoder() {
    long encoderValue = get_encoder_value();
    if (encoderValue == GrillConstants::ENCODER_ERROR || encoderValue == lastEncoderValue) { return; }
    lastEncoderValue = encoderValue;

    String encoderValueStr = String(encoderValue);
    String stringTopicEncoder = mqtt->parse_topic(GrillConstants::TOPIC_STATE_SENSOR_POSITION);
    Serial.println("Encoder " + String(grillIndex) + " = " + encoderValue);
    mqtt->publish_message(stringTopicEncoder, encoderValueStr, true);
}

bool GrillSensor::is_at_top()
{   
    return limit_switch_pressed(PIN_CS_LIMIT_LINEAL[grillIndex]);
}

bool GrillSensor::limit_switch_pressed(const int CS_LIMIT_SWITCH) {
    return digitalRead(CS_LIMIT_SWITCH) == LOW;
}


// ------------- ROTOR ENCODER ------------- //
 
int GrillSensor::get_rotor_encoder_value()
{  
    int rotorEncoderValue = hardware->rotorEncoder->get_data();
     
    if (rotorEncoderValue<0) { rotorEncoderValue+=360; }  
    if (rotorEncoderValue == 0) return lastRotorEncoderValue;
 
    return rotorEncoderValue;
}

void GrillSensor::update_rotor_encoder() { 

    int rotorEncoderValue = get_rotor_encoder_value();

    if (rotorEncoderValue != lastRotorEncoderValue) {
        lastRotorEncoderValue = rotorEncoderValue;
        lastRotorChangeAt = millis();
    }

    if (rotorEncoderValue == lastPublishedRotorValue) { return; }

    // Nothing published yet also counts: the retained value may be from before a reboot.
    bool settled = millis() - lastRotorChangeAt >= GrillConstants::ROTOR_SETTLE_MS;
    bool bigStep = abs(rotorEncoderValue - lastPublishedRotorValue) >= GrillConstants::ROTOR_PUBLISH_STEP;
    if (!settled && !bigStep) { return; }

    lastPublishedRotorValue = rotorEncoderValue;
    Serial.println("Rotor Encoder = " + String(rotorEncoderValue));
    String topic = mqtt->parse_topic(GrillConstants::TOPIC_STATE_SENSOR_ROTATION);
    mqtt->publish_message(topic, String(rotorEncoderValue), true);
}

void GrillSensor::reset_rotor_encoder() {

    hardware->reset_rotor_encoder();
    lastRotorEncoderValue = 0;
    lastPublishedRotorValue = 0;

    Serial.println("Rotor Encoder zeroed");
    String topic = mqtt->parse_topic(GrillConstants::TOPIC_STATE_SENSOR_ROTATION);
    mqtt->publish_message(topic, "0", true);
}


// ------------- THERMOCOUPLE ------------- //

int GrillSensor::get_temperature() {
    if (!hardware->thermocouple) { return -1; }

    // NaN when the MAX31855 flags a fault, e.g. the thermocouple is unplugged.
    double temperature = hardware->thermocouple->readCelsius();
    if (isnan(temperature)) { return -1; }

    return (int) temperature;
}

void GrillSensor::update_temperature() {
    int temperature = get_temperature();

    if (!is_valid_temperature(temperature)) {
        if (!temperatureError) { mqtt->print("Error reading temperature!"); }
        temperatureError = true;
        // Old readings would let a regulator keep moving on a sensor that no longer answers.
        temperatureSampleCount = 0;
        return;
    }
    temperatureError = false;

    temperatureSamples[temperatureSampleNext] = temperature;
    temperatureSampleNext = (temperatureSampleNext + 1) % GrillConstants::TEMPERATURE_AVERAGE_SAMPLES;
    if (temperatureSampleCount < GrillConstants::TEMPERATURE_AVERAGE_SAMPLES) { temperatureSampleCount++; }

    String temperatureStr = String(temperature);
    Serial.println("Temperature = " + temperatureStr);
    String topic = mqtt->parse_topic(GrillConstants::TOPIC_STATE_SENSOR_TEMP);
    mqtt->publish_message(topic, temperatureStr);
}

bool GrillSensor::is_valid_temperature(int temperature) 
{
    return (temperature != -1);
}

bool GrillSensor::has_thermocouple() {
    return hardware->thermocouple != nullptr;
}

int GrillSensor::get_average_temperature() {
    if (temperatureSampleCount == 0) { return -1; }

    long sum = 0;
    for (int i = 0; i < temperatureSampleCount; i++) { sum += temperatureSamples[i]; }
    return (int) lround((double) sum / temperatureSampleCount);
} 
