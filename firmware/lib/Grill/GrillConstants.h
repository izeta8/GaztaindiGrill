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

    // JSON field names for program steps
    static constexpr const char* JSON_TIME = "time";
    static constexpr const char* JSON_TEMPERATURE = "temperature";
    static constexpr const char* JSON_POSITION = "position";
    static constexpr const char* JSON_ROTATION = "rotation";
    static constexpr const char* JSON_ACTION = "action";
    
    // MQTT Topics
    static constexpr const char* TOPIC_LOG = "log";
    static constexpr const char* TOPIC_REINICIAR = "reiniciar";
    static constexpr const char* TOPIC_DIRIGIR = "dirigir";
    static constexpr const char* TOPIC_INCLINAR = "inclinar";
    static constexpr const char* TOPIC_ESTABLECER_POSICION = "establecer_posicion";
    static constexpr const char* TOPIC_EJECUTAR_PROGRAMA = "ejecutar_programa";
    static constexpr const char* TOPIC_CANCELAR_PROGRAMA = "cancelar_programa";
    static constexpr const char* TOPIC_ESTABLECER_INCLINACION = "establecer_inclinacion";
    static constexpr const char* TOPIC_ESTABLECER_MODO = "establecer_modo";
    
    // Grill Commands
    static constexpr const char* CMD_MOVE = "dirigir";
    static constexpr const char* PAYLOAD_UP = "subir";
    static constexpr const char* PAYLOAD_DOWN = "bajar";
    static constexpr const char* PAYLOAD_STOP = "parar";

    static constexpr const char* CMD_ROTATE = "inclinar";
    static constexpr const char* PAYLOAD_CLOCKWISE = "horario";
    static constexpr const char* PAYLOAD_COUNTER_CLOCKWISE = "antihorario";

    static constexpr const char* CMD_SET_POSITION = "establecer_posicion";

    static constexpr const char* CMD_RESTART = "reiniciar";

    static constexpr const char* CMD_EXECUTE_PROGRAM = "ejecutar_programa";

    static constexpr const char* CMD_CANCEL_PROGRAM = "cancel_program";

    static constexpr const char* CMD_SET_TILT = "establecer_inclinacion";

    static constexpr const char* CMD_SET_MODE = "establecer_modo";
    
    static constexpr const char* PAYLOAD_NORMAL = "normal";
    static constexpr const char* PAYLOAD_SPINNING = "burruntzi";
    static constexpr const char* PAYLOAD_DUAL = "dual";
};

#endif
