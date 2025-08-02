#include <Arduino.h>
#include <GRILL_config.h>
#include <Grill.h>

extern PubSubClient client;

Grill::Grill(int index) : index(index), hardware(nullptr), mqtt(nullptr), modeManager(nullptr), sensor(nullptr), movement(nullptr), programManager(nullptr) 
    {

        mqtt = new GrillMQTT(index);
        modeManager = new ModeManager();
        hardware = new HardwareManager(index, mqtt);
        sensor = new GrillSensor(index, mqtt, hardware, modeManager);
        movement = new MovementManager(index, mqtt, hardware, sensor, modeManager);
        programManager = new ProgramManager(index, mqtt, movement);

    }

//
// Setup
//
bool Grill::setup_devices() {
    return hardware->setup_devices();
}


void Grill::reset_system() {
    movement->reset_system();
}

//
// Movements
//
void Grill::go_up() {
    movement->go_up();
}

void Grill::go_down() {
    movement->go_down();
}

void Grill::go_to(int position) {
    movement->go_to(position);
}

void Grill::stop_lineal_actuator() {
    movement->stop_lineal_actuator();
}

//
// Sensors
//
int Grill::get_temperature() {
    return sensor->get_temperature();
}

long Grill::get_encoder() {
    return sensor->get_encoder_value();
}

bool Grill::is_at_top() {
    return sensor->is_at_top();
}

bool Grill::is_at_top_dual() {
    return sensor->is_at_top_dual;
}

void Grill::set_is_at_top_dual(bool isAtTop) {
    sensor->is_at_top_dual = isAtTop;
}

//
// Sensor updates
//
void Grill::update_encoder() {
    sensor->update_encoder();
}

void Grill::update_rotor_encoder() {
    sensor->update_rotor_encoder();
}

void Grill::update_program() {
    programManager->update_program();
}   

//
// Handle stops
//
void Grill::handle_rotor_stop() {
    movement->handle_rotor_stop();
}

void Grill::handle_position_stop() {
    movement->handle_position_stop();
}

void Grill::handle_temperature_stop() {
    movement->handle_temperature_stop();
}

//
// Mode
//
DualModeDirection Grill::get_dual_direction() {
    return modeManager->dual_direction;
}

Mode Grill::get_mode() {
    return modeManager->mode;
}

//
// Programs
//
void Grill::execute_program(const char* program) {
    programManager->execute_program(program);
}

void Grill::update_program() {
    programManager->update_program();
}

//
// MQTT
//

void Grill::subscribe_to_topics() {
    mqtt->subscribe_to_topics();
}

void Grill::handle_mqtt_message(const char* pAction, const char* pPayload) {
    String action(pAction);
    String payload(pPayload);

    String topic = mqtt->parse_topic("mqtt_topic_listener");
    String message = "An action has reached. " + action + ": " + payload;
    mqtt->publish_message(topic, message);

    if (action == "dirigir") {
        if (payload == "subir") {
            movement->go_up();
        } else if (payload == "bajar") {
            movement->go_down();
        } else if (payload == "parar") {
            movement->stop_lineal_actuator();
        }
    }  

     if (action == "inclinar") {
        if (payload == "horario") {
            movement->rotate_clockwise();
        } else if (payload == "antihorario") {
            movement->rotate_counter_clockwise();
        } else if (payload == "parar") {
            movement->stop_rotor();
        }
    }  

    if (action == "establecer_posicion") {
        int posicion = payload.toInt();
        movement->go_to(posicion);
    }
    
    if (action == "reiniciar") {
        mqtt->print("Reiniciando sistema");
    }
    
    if (action == "ejecutar_programa") {
        mqtt->print("Ejecutando un programa..."); 
        programManager->execute_program(pPayload);
    }
    
    if (action == "cancel_program") {
        programManager->cancel_program();
        mqtt->print("Programa cancelado");
    }
    
    if (action == "establecer_inclinacion")
    {
        int grades = payload.toInt();
        movement->go_to_rotor(grades);
    }
    
    if (action == "establecer_modo")
    {
        if (payload == "normal")
        {
            modeManager->mode = NORMAL;
            movement->stop_lineal_actuator();
            movement->reset_rotor();
        }
        
        if (payload == "burruntzi") 
        {
            modeManager->mode = SPINNING;
            movement->stop_lineal_actuator();
            movement->stop_rotor();
        }
        
        if (payload == "dual")
        {
            // The dual mode is controller in the main function from src/GaztaindiGrill.cpp
            modeManager->mode = DUAL;
        }
    }
}
