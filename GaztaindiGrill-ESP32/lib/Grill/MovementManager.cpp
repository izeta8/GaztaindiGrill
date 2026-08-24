

#include <MovementManager.h>

MovementManager::MovementManager(int index, GrillMQTT* mqtt, HardwareManager* hardware, GrillSensor* sensor, ModeManager* modeManager, StatusLED* statusLed): 
    grillIndex(index), 
    mqtt(mqtt),
    hardware(hardware),
    sensor(sensor),
    modeManager(modeManager),
    targetPosition(GrillConstants::NO_TARGET),
    targetDegrees(GrillConstants::NO_TARGET),
    targetTemperature(GrillConstants::NO_TARGET),
    statusLed(statusLed),
    isLinearResetting(false),
    guardState(GUARD_IDLE),
    pendingRotationDegrees(GrillConstants::NO_TARGET),
    positionBeforeRotation(GrillConstants::NO_TARGET)
     {}


/// ----------- LINEAL ACTUATOR ----------- ///

void MovementManager::go_up() {

    if (modeManager->mode == DUAL)
    {
        modeManager->dual_direction = UPWARDS;
    } else 
    {
        go_up_raw();
    }
}

void MovementManager::go_up_raw() {
    hardware->drive->setSpeed(-255);
}

void MovementManager::go_down() {

    if (modeManager->mode == DUAL)
    {
        modeManager->dual_direction = DOWNWARDS;
    } else 
    {
        go_down_raw();
    }
}

void MovementManager::go_down_raw() {
    hardware->drive->setSpeed(255);
}

void MovementManager::stop_lineal_actuator() {
    if (modeManager->mode == DUAL)
    {
        modeManager->dual_direction = STILL;
    } else 
    {
        stop_lineal_actuator_raw();
    }
}

void MovementManager::stop_lineal_actuator_raw() {
    hardware->drive->setSpeed(0);
}

/// ----------- ROTOR ----------- ///

bool MovementManager::has_rotor()
{
    return hardware->rotor != nullptr;
}

void MovementManager::rotate_clockwise()
{
    if (!has_rotor()) { return; }
    hardware->rotor->rotate_clockwise();
}

void MovementManager::rotate_counter_clockwise()
{
    if (!has_rotor()) { return; }
    hardware->rotor->rotate_counter_clockwise();
}

void MovementManager::stop_rotor()
{
    if (!has_rotor()) { return; }
    hardware->rotor->stop();
}

void MovementManager::turn_around() {
    mqtt->print("Turning around");
    int currentInclination = sensor->get_rotor_encoder_value();
    int targetInclination = (currentInclination + 180) % 360;
    go_to_rotor(targetInclination);
}


/// -------------------------- ///
///            GO TOs          /// 
/// -------------------------- ///

// ------------- ROTOR ------------- //

void MovementManager::go_to_rotor(int degrees) {

    // The MQTT boundary (Grill::handle_mqtt_message) validates this too, and can answer the
    // client. Kept here as well because turn_around() reaches this directly.
    if (!has_rotor() || degrees < 0 || degrees >= 360) { return; }

    long currentPosition = sensor->get_encoder_value();

    // Without a position reading there is no way to know whether the tilt would reach the
    // embers, so the turn does not start at all.
    if (currentPosition == (long)GrillConstants::ENCODER_ERROR) {
        mqtt->print("Rotation refused: the position encoder is not answering");
        return;
    }

    // Too low to tilt: raise first and hold the turn. The target angle does not lower the bar,
    // because the shortest arc to it sweeps through 90 degrees, where the drop is maximal.
    if (currentPosition < GrillConstants::SAFE_ROTATION_POSITION_PCT) {

        positionBeforeRotation = (int)currentPosition;
        pendingRotationDegrees = degrees;
        guardState = GUARD_LIFTING;

        mqtt->print("Rotation held: raising from " + String(currentPosition) + " to " +
                    String(GrillConstants::SAFE_ROTATION_POSITION_PCT) + " first");

        go_to(GrillConstants::SAFE_ROTATION_POSITION_PCT);
        return;
    }

    // Already high enough. Nothing to come back down to, so no position is remembered.
    guardState = GUARD_ROTATING;
    start_rotation(degrees);
}

void MovementManager::start_rotation(int degrees) {

    int currentRotorPosition = sensor->get_rotor_encoder_value();
    targetDegrees = degrees;

    int differenceRight = (targetDegrees - currentRotorPosition + 360) % 360;
    int differenceLeft = (currentRotorPosition - targetDegrees + 360) % 360;

    mqtt->print("New target: " + String(targetDegrees) + " (current: " + String(currentRotorPosition) + ")");

    // In the handle_rotor_stop() function that is called in loop, we handle when we have to stop
    if (differenceRight < differenceLeft)
    {
        rotate_counter_clockwise();
    } else
    {
        rotate_clockwise();
    }
}

/// ------------------------------------ ///
///       ROTATION HEADROOM GUARD        ///
/// ------------------------------------ ///

// Lowest position (0-100%) at which the rack may sit at this tilt without its lower edge
// reaching the embers.
int MovementManager::min_safe_position(int degrees) {

    // Horizontal, either face up, has no edge hanging below the axis, so the grill may go all
    // the way down. ROTOR_MARGIN is the same tolerance handle_rotor_stop() settles for.
    int fromHorizontal = degrees % 180;
    if (fromHorizontal < 0) { fromHorizontal += 180; }

    if (fromHorizontal <= GrillConstants::ROTOR_MARGIN ||
        fromHorizontal >= 180 - GrillConstants::ROTOR_MARGIN) {
        return 0;
    }

    float drop = GrillConstants::ROTATION_MAX_DROP_PCT * fabs(sin(radians(degrees)));
    int minimum = (int)ceil(drop) + GrillConstants::CLEARANCE_PCT;

    if (minimum > 100) { minimum = 100; }
    return minimum;
}

// Advances the guard. Called every loop from GrillSystem::handle_rotor_operations(), right
// after handle_rotor_stop(), so the targets it reads are already up to date.
void MovementManager::update_rotation_guard() {

    switch (guardState) {

        case GUARD_LIFTING:
            // The lift is over once handle_position_stop() has cleared the target.
            if (targetPosition == GrillConstants::NO_TARGET) {
                mqtt->print("Safe height reached, starting the held rotation");
                guardState = GUARD_ROTATING;
                start_rotation(pendingRotationDegrees);
                pendingRotationDegrees = GrillConstants::NO_TARGET;
            }
            break;

        case GUARD_ROTATING:
            // handle_rotor_stop() clears the target once the rotor settles on the angle.
            if (targetDegrees == GrillConstants::NO_TARGET) {

                // Nothing was lifted, so there is nowhere to come back down to.
                if (positionBeforeRotation == GrillConstants::NO_TARGET) {
                    reset_rotation_guard();
                    break;
                }

                // The rack may have settled still tilted, and then it cannot come all the way
                // back: the floor for the angle it stopped at wins over where it started.
                int finalAngle = sensor->get_rotor_encoder_value();
                int safetyFloor = min_safe_position(finalAngle);
                int returnTo = (positionBeforeRotation > safetyFloor) ? positionBeforeRotation : safetyFloor;

                mqtt->print("Rotation done at " + String(finalAngle) + ", returning to " +
                            String(returnTo) + " (was " + String(positionBeforeRotation) +
                            ", floor " + String(safetyFloor) + ")");

                guardState = GUARD_RETURNING;
                go_to(returnTo);
            }
            break;

        case GUARD_RETURNING:
            // Back down. handle_position_stop() clears the target once it arrives.
            if (targetPosition == GrillConstants::NO_TARGET) {
                reset_rotation_guard();
            }
            break;

        default:
            break;
    }
}

void MovementManager::reset_rotation_guard() {
    guardState = GUARD_IDLE;
    pendingRotationDegrees = GrillConstants::NO_TARGET;
    positionBeforeRotation = GrillConstants::NO_TARGET;
}

void MovementManager::handle_rotor_stop() {
    
    int currentRotorPosition = sensor->get_rotor_encoder_value();

    if (abs(currentRotorPosition-targetDegrees) <= GrillConstants::ROTOR_MARGIN && targetDegrees != GrillConstants::NO_TARGET ) { 
        stop_rotor();
        targetDegrees = GrillConstants::NO_TARGET;
    } 
}

// ------------- LINEAL ACTUATOR ------------- //

void MovementManager::go_to(int position) {

    if (position < 0) position = 0;
    if (position > 100) position = 100;
    
    targetPosition = position;
    int currentPercentage = sensor->get_encoder_value();

    mqtt->print("New target: " + String(position) + " (current: " + String(currentPercentage) + ")");

    // In the function handle_temperature_stop(), which is called in loop, we handle when we have to stop.
    if (currentPercentage < position) {
        go_up();
    } else if (currentPercentage > position) {
        go_down();
    }
}

void MovementManager::handle_position_stop() {
    int currentPercentage = sensor->get_encoder_value();

    if (abs(currentPercentage - targetPosition) <= GrillConstants::POSITION_MARGIN && targetPosition != GrillConstants::NO_TARGET ) {
        stop_lineal_actuator();
        targetPosition = GrillConstants::NO_TARGET;
    } 
}


void MovementManager::go_to_temp(int temperature) {

    targetTemperature = temperature;
    int currentTemperature = sensor->get_temperature();

    // If the temperature is not valid, we exit the method
    if (!sensor->is_valid_temperature(currentTemperature)) {return;}

    mqtt->print("New target: " + String(targetTemperature) + " (current: " + String(currentTemperature) + ")");

    // In the function handle_temperature_stop(), which is called in loop, we handle when we have to stop.
    if (currentTemperature < targetTemperature) {
        go_up();
    } else if (currentTemperature > targetTemperature) {
        go_down();
    }
}

void MovementManager::handle_temperature_stop() {

    int currentTemperature = sensor->get_temperature();
 
    // If the temperature is not valid, we exit the method
    if (!sensor->is_valid_temperature(currentTemperature)) {return;}

    if (abs(currentTemperature - targetTemperature) <= GrillConstants::TEMPERATURE_MARGIN && targetTemperature != GrillConstants::NO_TARGET ) {
        stop_lineal_actuator();
        targetTemperature = GrillConstants::NO_TARGET;
    } 
}

/// ------------------------------------ ///
///             RESET SYSTEMS            /// 
/// ------------------------------------ ///

void MovementManager::start_reset()
{
    isLinearResetting = true;
    go_up(); 
    mqtt->print("Moving linear actuators to top");
}

bool MovementManager::check_reset_status()
{
    if (sensor->is_at_top()) {
        stop_lineal_actuator();
        hardware->reset_encoder(hardware->encoder);
        sensor->update_encoder();
        isLinearResetting = false;
        return true;
    }
    return false;
}

void MovementManager::emergency_stop()
{
    stop_lineal_actuator();
    stop_rotor();
    isLinearResetting = false;
    targetTemperature = GrillConstants::NO_TARGET;
    targetDegrees = GrillConstants::NO_TARGET;
    targetPosition = GrillConstants::NO_TARGET;
    // Otherwise a held rotation would stay armed and fire on the next lift.
    reset_rotation_guard();
    mqtt->print("EMERGENCY STOP EXECUTED");
}

bool MovementManager::is_resetting()
{
    return isLinearResetting;
}

bool MovementManager::has_any_active_target() {
    // The guard has to count. Between the lift and the rotation there is a moment where
    // targetPosition is already cleared and targetDegrees is not set yet; without this last
    // check ProgramManager::check_target_reached() would call the step done mid-manoeuvre,
    // before the rack has turned at all.
    return (targetTemperature != GrillConstants::NO_TARGET ||
            targetPosition != GrillConstants::NO_TARGET ||
            targetDegrees != GrillConstants::NO_TARGET ||
            guardState != GUARD_IDLE);
}