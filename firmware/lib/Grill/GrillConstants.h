#ifndef GRILL_CONSTANTS
#define GRILL_CONSTANTS

class GrillConstants {
public:

    static constexpr int NUM_GRILLS = 2;

    // Special values
    static constexpr int NO_TARGET = -999;
    static constexpr float ENCODER_ERROR = -9999.0f;
    
    // Hardware constants (PT100)
    static constexpr float RREF = 430.0f;
    static constexpr float RNOMINAL = 100.0f;
    
    // Margins
    static constexpr int POSITION_MARGIN = 5;        // For go_to position
    static constexpr int TEMPERATURE_MARGIN = 2;     // For go_to temperature
    static constexpr int ROTOR_MARGIN = 3;           // For go_to rotor
    
    // Timeouts
    static constexpr unsigned long RESET_TIMEOUT = 1000;     //  1 seconds
    static constexpr unsigned long MOVEMENT_TIMEOUT = 30000; // 30 segundos
    
    // Time intervals
    static constexpr unsigned long SENSOR_UPDATE_INTERVAL = 1500;
    static constexpr unsigned long PROGRAM_UPDATE_INTERVAL = 100;
    
    // System limits
    static constexpr int MAX_PROGRAM_STEPS = 50;
};

#endif
