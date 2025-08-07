#include <ProgramManager.h>

ProgramManager::ProgramManager(int index, GrillMQTT* mqtt, MovementManager* movement) : 
    grillIndex(index), mqtt(mqtt), movement(movement),
    programStepsCount(0), programCurrentStep(0), stepDurationStart(0) {}

    
void ProgramManager::execute_program(const char* program) { 
     
    // Cancel any previous program.
    cancel_program();  

    StaticJsonDocument<5000> doc;
    DeserializationError error = deserializeJson(doc, program);

    if (error) {
        mqtt->print("Error deserializing JSON.");
        return;
    }
    
    mqtt->print("JSON deserialized successfully.");
    serializeJson(doc, Serial);

    JsonArray array = doc.as<JsonArray>();
    programStepsCount = array.size(); 
    
    for (int i = 0; i < programStepsCount; i++) {
        
        // Fill the 'steps' array with the program received by MQTT. 

        JsonObject step = array[i];
        
        Step newStep = {
            .time = step.containsKey(GrillConstants::JSON_TIME) ? step[GrillConstants::JSON_TIME].as<int>() : 0,
            .temperature = step.containsKey(GrillConstants::JSON_TEMPERATURE) ? step[GrillConstants::JSON_TEMPERATURE].as<int>() : -1,
            .position = step.containsKey(GrillConstants::JSON_POSITION) ? step[GrillConstants::JSON_POSITION].as<int>() : -1,
            .rotation = step.containsKey(GrillConstants::JSON_ROTATION) ? step[GrillConstants::JSON_ROTATION].as<int>() : -1,
            .action = step.containsKey(GrillConstants::JSON_ACTION) ? step[GrillConstants::JSON_ACTION].as<const char*>() : nullptr
        };
        
        steps[i] = newStep;
    }

    // Initialize state variables
    programCurrentStep = 0;
    stepDurationStart = millis();
    
    // Initialize state machine
    programState = PROGRAM_RUNNING;
    stepState = STEP_STARTING;
}

void ProgramManager::cancel_program()
{
    movement->targetPosition = GrillConstants::NO_TARGET;
    movement->targetDegrees = GrillConstants::NO_TARGET;
    movement->targetTemperature = GrillConstants::NO_TARGET;
    programStepsCount = 0;
    programCurrentStep = 0;
    stepDurationStart = 0;
    
    // Reset state machine
    programState = PROGRAM_IDLE;
    stepState = STEP_STARTING;

    mqtt->print("Program cancelled and system restarted."); 
}

void ProgramManager::update_program() {

    // Si no hay programa activo, salir
    if (programState != PROGRAM_RUNNING) {
        return;
    }
    
    // Verificar si hemos completado todos los pasos
    if (programCurrentStep >= programStepsCount) {
        programState = PROGRAM_COMPLETED;
        mqtt->print("Program completed successfully");
        return;
    }
    
    Step& currentStep = steps[programCurrentStep];
    
    // Máquina de estados para el paso actual
    switch (stepState) {
        case STEP_STARTING:
            start_current_step();
            break;
            
        case STEP_MOVING_TO_TARGET:
            check_target_reached();
            break;
            
        case STEP_WAITING_TIME:
            check_time_elapsed();
            break;
            
        case STEP_EXECUTING_ACTION:
            execute_current_action();
            break;
            
        case STEP_COMPLETED:
            advance_to_next_step();
            break;
    }
}

void ProgramManager::start_current_step() {
    
    Step& step = steps[programCurrentStep];
    
    mqtt->print("Starting step " + String(programCurrentStep + 1) + "/" + String(programStepsCount));
    
    // Verificar qué tipo de paso es
    if (step.action != nullptr) {
        // Es una acción
        stepState = STEP_EXECUTING_ACTION;
    } else if (step.temperature != -1) {
        // Movimiento por temperatura
        movement->go_to_temp(step.temperature);
        stepState = STEP_MOVING_TO_TARGET;
    } else if (step.position != -1) {
        // Movimiento por posición
        movement->go_to(step.position);
        stepState = STEP_MOVING_TO_TARGET;
    } else if (step.rotation != -1) {
        // Movimiento por rotación
        movement->go_to_rotor(step.rotation);
        stepState = STEP_MOVING_TO_TARGET;
    }
}

void ProgramManager::check_target_reached() {
    // Verificar si MovementManager terminó el movimiento
    if (!movement->has_any_active_target()) {
        mqtt->print("Target reached for step " + String(programCurrentStep + 1));
        stepDurationStart = millis();
        stepState = STEP_WAITING_TIME;
    }
}

void ProgramManager::check_time_elapsed() {
    Step& step = steps[programCurrentStep];
    unsigned long stepElapsedTime = millis() - stepDurationStart;
    
    if (stepElapsedTime >= step.time * 1000) {
        mqtt->print("Time elapsed for step " + String(programCurrentStep + 1));
        stepState = STEP_COMPLETED;
    }
}

void ProgramManager::execute_current_action() {
    Step& step = steps[programCurrentStep];
    
    if (strcmp(step.action, "flip") == 0) {
        mqtt->print("Executing flip action");
        movement->turn_around();
        stepState = STEP_MOVING_TO_TARGET;
    } else {
        mqtt->print("Unknown action: " + String(step.action));
        stepState = STEP_COMPLETED;
    }
}

void ProgramManager::advance_to_next_step() {
    mqtt->print("Step " + String(programCurrentStep + 1) + " completed");
    programCurrentStep++;
    stepState = STEP_STARTING;
}
