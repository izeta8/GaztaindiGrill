#ifndef GRILL_SYSTEM_H
#define GRILL_SYSTEM_H

#include <GRILL_config.h>
#include <Grill.h>
#include <DualModeCoordinator.h>

class GrillSystem {
public:
    GrillSystem();
    ~GrillSystem();
    
    // Setup of the system
    bool initialize_system();
    
    // Main loop
    void update();
    
    // Access to individual grills
    Grill* get_grill(int index);
    
    // Dual mode management
    bool is_dual_mode_active();
    void handle_dual_mode();
    
private:
    Grill* grills[GrillConstants::NUM_GRILLS];
    DualModeCoordinator* dualCoordinator;
    
    void update_individual_grills();
    void handle_rotor_operations();
    void handle_temperature_updates();
    
    // Temperature update timing
    unsigned long previousMillisTemp;
    const long intervalTemp = 1500;
};

#endif
