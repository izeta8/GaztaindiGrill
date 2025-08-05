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
