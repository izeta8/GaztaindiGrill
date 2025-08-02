

#ifndef GRILL_MODE_H
#define GRILL_MODE_H

enum Mode {
    NORMAL,
    SPINNING,
    DUAL
};

enum DualModeDirection {
    UPWARDS,
    STILL,
    DOWNWARDS
};

class ModeManager {
public:

    DualModeDirection dual_direction = STILL;
    Mode mode = NORMAL;
    
private:

    int grillIndex;
    
};
#endif
