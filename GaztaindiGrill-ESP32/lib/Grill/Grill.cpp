#include <Arduino.h>
#include <GrillConfig.h>
#include <Grill.h>

extern PubSubClient client;

Grill::Grill(int index, ModeManager* sharedModeManager, StatusLED* statusLed) :
        index(index),
        hardware(nullptr),
        mqtt(nullptr),
        statusLed(statusLed),
        modeManager(sharedModeManager),
        sensor(nullptr),
        movement(nullptr),
        programManager(nullptr) 
    {

        mqtt = new GrillMQTT(index);
        hardware = new HardwareManager(index, mqtt);
        sensor = new GrillSensor(index, mqtt, hardware, modeManager);
        movement = new MovementManager(index, mqtt, hardware, sensor, modeManager, statusLed);
        programManager = new ProgramManager(index, mqtt, movement, sensor, statusLed);

    }

//
// Setup
//
bool Grill::setup_devices() {
    return hardware->setup_devices();
}


void Grill::start_reset() {
    movement->start_reset();
}

bool Grill::check_reset_status() {
    return movement->check_reset_status();
}

void Grill::emergency_stop() {
    // A program left running would move the grill again on its next step, or on its next
    // temperature correction, right after somebody stopped it.
    if (programManager->is_program_running()) { programManager->finish_program(true); }
    movement->emergency_stop();
}

bool Grill::is_resetting() {
    return movement->is_resetting();
}

void Grill::reset_encoder() {
    hardware->reset_encoder(hardware->encoder);
    sensor->update_encoder();
}

void Grill::reset_rotor_encoder() {
    sensor->reset_rotor_encoder();
}

//
// Movements
//
void Grill::go_up_raw() {
    movement->go_up_raw();
}

void Grill::go_down_raw() {
    movement->go_down_raw();
}

void Grill::stop_lineal_actuator_raw() {
    movement->stop_lineal_actuator_raw();
}

void Grill::go_to(int position) {
    movement->go_to(position);
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

//
// Sensor updates
//
void Grill::update_encoder() {
    sensor->update_encoder();
}

void Grill::update_rotor_encoder() {
    sensor->update_rotor_encoder();
}

void Grill::update_temperature() {
    sensor->update_temperature();
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


//
// Rotation clearance guard
//
void Grill::update_rotation_guard() {
    movement->update_rotation_guard();
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
void Grill::update_program() {
    programManager->update_program();
}

bool Grill::is_program_running() { 
    return programManager->is_program_running(); 
}

void Grill::publish_program_status() {
    programManager->publish_program_status();
}

//
// MQTT
//

void Grill::subscribe_to_topics() {
    mqtt->subscribe_to_topics();
}

void Grill::reply_ok_if_unanswered(GrillRequest& request) {
    // Only answer somebody who actually asked. An EVERYONE id means the payload carried no
    // requestId at all: a retained state topic the ESP32 reads back at boot, or a manual
    // mosquitto_pub. Nobody is waiting, so an automatic "ok" would just be noise. Deliberate
    // broadcasts still go out through reply_to().
    if (request.replied) { return; }
    if (request.id == GrillConstants::PAYLOAD_REQUEST_ID_EVERYONE) { return; }
    mqtt->reply_ok(request);
}

void Grill::handle_mqtt_message(const char* pAction, GrillRequest& request) {
    String topic(pAction);
    String payload = request.value;

    // We don't log the log topic itself to avoid loops
    if (topic != GrillConstants::TOPIC_LOG) {
        mqtt->print("Action received: " + topic + " -> " + payload);

        if (statusLed && topic != GrillConstants::TOPIC_CMD_PROG_CANCEL) {
            statusLed->show_action_pulse();
        }
    }

    // If resetting, ignore all other commands
    if (is_resetting()) {
        mqtt->print("Grill is resetting, command ignored");
        mqtt->reply_error(request, GrillConstants::PAYLOAD_RESETTING);
        return;
    }

    if (topic == GrillConstants::TOPIC_CMD_MOVE_VERTICAL) {
        if (payload == GrillConstants::PAYLOAD_UP) {
            movement->go_up();
        } else if (payload == GrillConstants::PAYLOAD_DOWN) {
            movement->go_down();
        } else if (payload == GrillConstants::PAYLOAD_STOP) {
            movement->stop_lineal_actuator();
        }
    }

    if (topic == GrillConstants::TOPIC_CMD_MOVE_ROTATION) {
        // Only grill 0 is built with a rotor. Without this the call below would dereference
        // an unallocated pointer on grill 1.
        if (!movement->has_rotor()) {
            mqtt->reply_error(request, GrillConstants::ERROR_NO_ROTOR);
            return;
        }
        // No headroom guard here on purpose: turning by hand is somebody watching the grill and
        // stopping it. Only turns with a destination, which run unattended, get lifted.
        if (payload == GrillConstants::PAYLOAD_CLOCKWISE) {
            movement->rotate_clockwise(GrillConstants::ROTOR_PWM_MANUAL);
        } else if (payload == GrillConstants::PAYLOAD_COUNTER_CLOCKWISE) {
            movement->rotate_counter_clockwise(GrillConstants::ROTOR_PWM_MANUAL);
        } else if (payload == GrillConstants::PAYLOAD_STOP) {
            movement->stop_rotor();
        }
    }

    if (topic == GrillConstants::TOPIC_CMD_SET_POSITION) {
        int posicion = payload.toInt();
        movement->go_to(posicion);
    }


    if (topic == GrillConstants::TOPIC_CMD_PROG_EXECUTE) {
        mqtt->print("Executing a program...");
        programManager->execute_program(request);
    }

    if (topic == GrillConstants::TOPIC_CMD_PROG_CANCEL) {
        if (!programManager->is_program_running()) {
            // The client only asks because it thinks a program is running, so correct its state too.
            programManager->publish_program_status();
            mqtt->reply_error(request, GrillConstants::ERROR_NO_PROGRAM_RUNNING);
            return;
        }
        programManager->finish_program(true);
        mqtt->print("Program cancelled");
    }

    if (topic == GrillConstants::TOPIC_CMD_PROG_SKIP_STEP) {
        if (!programManager->is_program_running()) {
            programManager->publish_program_status();
            mqtt->reply_error(request, GrillConstants::ERROR_NO_PROGRAM_RUNNING);
            return;
        }
        programManager->skip_current_step();
    }

    if (topic == GrillConstants::TOPIC_CMD_SET_ROTATION)
    {
        if (!movement->has_rotor()) {
            mqtt->reply_error(request, GrillConstants::ERROR_NO_ROTOR);
            return;
        }
        // Validated here rather than inside go_to_rotor(): input is checked at the boundary,
        // and MovementManager stays free of any reply concern.
        int grades = payload.toInt();
        if (grades < 0 || grades >= 360) {
            mqtt->reply_error(request, GrillConstants::ERROR_ROTATION_OUT_OF_RANGE);
            return;
        }

        // Same reasoning as the manual rotation above: no position reading, no safe tilt.
        if (sensor->get_encoder_value() == (long)GrillConstants::ENCODER_ERROR) {
            mqtt->reply_error(request, GrillConstants::ERROR_ROTATION_UNSAFE);
            return;
        }

        if (movement->go_to_rotor(grades, request.id, request.command)) { mqtt->defer(request); }
    }

    if (topic == GrillConstants::TOPIC_CMD_SET_POSE)
    {
        if (!movement->has_rotor()) {
            mqtt->reply_error(request, GrillConstants::ERROR_NO_ROTOR);
            return;
        }

        // An object payload never reaches request.value, so the pose is parsed from the raw one.
        // Taken bare too, for a mosquitto_pub without the envelope.
        JsonDocument doc;
        if (deserializeJson(doc, request.raw) != DeserializationError::Ok) {
            mqtt->reply_error(request, GrillConstants::ERROR_INVALID_JSON);
            return;
        }

        JsonVariant pose = doc.as<JsonVariant>();
        if (doc[GrillConstants::JSON_VALUE].is<JsonObject>()) { pose = doc[GrillConstants::JSON_VALUE]; }

        if (!pose[GrillConstants::JSON_POSITION].is<int>() || !pose[GrillConstants::JSON_ROTATION].is<int>()) {
            mqtt->reply_error(request, GrillConstants::ERROR_INVALID_JSON);
            return;
        }

        int grades = pose[GrillConstants::JSON_ROTATION];
        if (grades < 0 || grades >= 360) {
            mqtt->reply_error(request, GrillConstants::ERROR_ROTATION_OUT_OF_RANGE);
            return;
        }

        // The manoeuvre reads the tilt it starts from, so it cannot begin on top of another one.
        if (programManager->is_program_running() || movement->has_any_active_target()) {
            mqtt->reply_error(request, GrillConstants::ERROR_ROTOR_BUSY);
            return;
        }

        if (sensor->get_encoder_value() == (long)GrillConstants::ENCODER_ERROR) {
            mqtt->reply_error(request, GrillConstants::ERROR_ROTATION_UNSAFE);
            return;
        }

        int position = pose[GrillConstants::JSON_POSITION];
        if (movement->go_to_rotor(grades, request.id, request.command, position)) { mqtt->defer(request); }
    }

    if (topic == GrillConstants::TOPIC_CMD_RESET_ROTATION)
    {
        if (!movement->has_rotor()) {
            mqtt->reply_error(request, GrillConstants::ERROR_NO_ROTOR);
            return;
        }

        // The headroom guard sizes its lift from the reported angle. Moving the zero while a
        // turn or a program is in flight would leave it measuring against a frame that is gone.
        if (programManager->is_program_running() || movement->has_any_active_target()) {
            mqtt->reply_error(request, GrillConstants::ERROR_ROTOR_BUSY);
            return;
        }

        reset_rotor_encoder();
        mqtt->print("Rotor zero moved to the current tilt");
    }

    if (topic == GrillConstants::TOPIC_CMD_REQ_PROG_STATUS) {
        programManager->publish_program_status();
    }
}
