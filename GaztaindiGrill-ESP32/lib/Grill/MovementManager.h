#ifndef GRILL_MOVEMENT_H
#define GRILL_MOVEMENT_H

#include <GrillMQTT.h>
#include <HardwareManager.h>
#include <GrillSensor.h>
#include <ModeManager.h>
#include <GrillConstants.h>
#include <StatusLED.h>

class MovementManager {
public:
    MovementManager(int index, GrillMQTT* mqtt, HardwareManager* hardware, GrillSensor* sensor, ModeManager* modeManager, StatusLED* statusLed);

    // ---------------- MOVEMENTS ----------------- //
    void go_up();
    void go_up_raw();
    void go_down();
    void go_down_raw();
    void stop_lineal_actuator();
    void stop_lineal_actuator_raw();

    // Only grill 0 is built with a rotor; on grill 1 hardware->rotor is null.
    bool has_rotor();

    void turn_around();
    void stop_rotor();

    // Rotation entry points. They return true when the answer has been deferred: a lift had
    // to start first, so whether the turn happens is only known later and the caller must
    // not answer now. The requester travels with the call rather than being stored between
    // messages, so a second command arriving mid-lift cannot steal the first one's answer.
    bool rotate_clockwise(const String& requestId, const String& command);
    bool rotate_counter_clockwise(const String& requestId, const String& command);

    // ------------------- GO_TO ------------------ //
    void go_to(int position);
    void go_to_temp(int temperature);
    bool go_to_rotor(int grades, const String& requestId, const String& command);

    // ------------------- RESETS ------------------ //
    void start_reset();
    bool check_reset_status();
    void emergency_stop();
    bool is_resetting();

    // ---- HANDLE STOPS (GO_TO / PROGRAM) ---- //
    void handle_rotor_stop();
    void handle_position_stop();
    void handle_temperature_stop();

    // ---------- ROTATION HEADROOM GUARD ---------- //
    int min_safe_position(int degrees);
    void update_rotation_guard();
    void reset_rotation_guard();

    // -------------- GO_TO TARGETS ------------- //
    int targetTemperature;
    int targetDegrees;
    int targetPosition;
    bool has_any_active_target();

private:

    int grillIndex;
    bool isLinearResetting;

    StatusLED* statusLed;
    GrillMQTT* mqtt;
    HardwareManager* hardware;
    GrillSensor* sensor;
    ModeManager* modeManager;

    enum RotationGuardState {
        GUARD_IDLE,
        GUARD_LIFTING,   // raising to a safe height; the rotor has not started yet
        GUARD_ROTATING,  // the rotor is running
        GUARD_RETURNING  // going back down to positionBeforeRotation
    };

    enum RotationDirection {
        ROTATION_NONE,
        ROTATION_CLOCKWISE,
        ROTATION_COUNTER_CLOCKWISE
    };

    RotationGuardState guardState;
    int pendingRotationDegrees; // held target angle while GUARD_LIFTING
    int positionBeforeRotation; // where to come back to; NO_TARGET when no lift was needed
    RotationDirection rotatingDirection; // directional turn in progress; NONE for a targeted turn

    // Who is waiting for the outcome of a rotation that had to lift first, and since when.
    // EVERYONE means nobody asked (a program step, turn_around), so only a failure is worth
    // broadcasting.
    String pendingRotationRequestId;
    String pendingRotationCommand;
    unsigned long liftStartedAt;

    // Drive the rotor with no headroom check. Only for callers already past the guard, same
    // split as go_up() / go_up_raw() on the linear actuator.
    void rotate_clockwise_raw();
    void rotate_counter_clockwise_raw();
    void stop_rotor_raw();

    void start_rotation(int degrees);
    bool start_rotating(RotationDirection direction, const String& requestId, const String& command);
    void run_rotating(RotationDirection direction);

};

#endif
