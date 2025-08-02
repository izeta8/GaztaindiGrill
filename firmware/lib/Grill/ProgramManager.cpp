

#include <ProgramManager.h>

ProgramManager::ProgramManager(int index, GrillMQTT* mqtt, MovementManager* movement) : 
    grillIndex(index), mqtt(mqtt), movement(movement),
    programStepsCount(0), programCurrentStep(0), stepObjectiveReached(false), stepDurationStart(0), cancelProgram(false) {}

    
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
    stepObjectiveReached = false;
    stepDurationStart = millis();
    cancelProgram = false;
}

void ProgramManager::cancel_program()
{
    movement->stop_lineal_actuator();  
    movement->targetDegrees = GrillConstants::NO_TARGET;
    movement->targetPosition = GrillConstants::NO_TARGET;
    movement->targetTemperature = GrillConstants::NO_TARGET;
    programStepsCount = 0;
    programCurrentStep = 0;
    cancelProgram = false;
    stepObjectiveReached = false;
    stepDurationStart = 0;

    mqtt->print("Program cancelled and system restarted."); 

}

void ProgramManager::update_program() {
     
    if (cancelProgram) {
        cancel_program();
        return;
    }

    if (programCurrentStep >= programStepsCount) {
        return;
    }

    Step& step = steps[programCurrentStep];
    
    if (!stepObjectiveReached) {
        if (step.temperature != -1) {
            movement->go_to_temp(step.temperature);
            return; // Exit the function to wait until the temperature reaches
        } else if (step.position != -1) {
            movement->go_to(step.position);
            return; // Exit the function to wait until the position reaches
        } else if (step.rotation != -1) {
            movement->go_to_rotor(step.rotation);
            return; // Exit the function to wait until the rotation reaches
        }
    } else {
        unsigned long stepElapsedTime = millis() - stepDurationStart;
        int time = step.time;

        if (stepElapsedTime >= time * 1000) {
            stepObjectiveReached = false;
            programCurrentStep++;
        }
    }
}
