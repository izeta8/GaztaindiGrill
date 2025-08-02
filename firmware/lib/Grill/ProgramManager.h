#ifndef GRILL_PROGRAM_H
#define GRILL_PROGRAM_H

#include <ArduinoJson.h>
#include <GrillMQTT.h>
#include <MovementManager.h>

class ProgramManager {
public:
    ProgramManager(int index, GrillMQTT* mqtt, MovementManager* movement);

    // ----------------- PROGRAMS ----------------- //
    void cancel_program();
    void update_program();
    void execute_program(const char* program);

private:

    int grillIndex;

    GrillMQTT* mqtt;
    MovementManager* movement;

    
    struct Step {
        int time;
        int temperature;
        int position;
        int rotation;
        const char* action;
    };
    Step steps[GrillConstants::MAX_PROGRAM_STEPS];
    int programStepsCount;
    int programCurrentStep;
    bool stepObjectiveReached;
    bool cancelProgram; 
    unsigned long stepDurationStart;
};

#endif
