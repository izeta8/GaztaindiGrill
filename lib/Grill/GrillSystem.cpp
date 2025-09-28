#include <GrillSystem.h>
#include <Arduino.h>

GrillSystem::GrillSystem() : dualCoordinator(nullptr), modeManager(nullptr), previousMillisTemp(0) {
    for (int i = 0; i < GrillConstants::NUM_GRILLS; ++i) {
        grills[i] = nullptr;
    }
}

GrillSystem::~GrillSystem() {
    delete dualCoordinator;
    delete modeManager;
    for (int i = 0; i < GrillConstants::NUM_GRILLS; ++i) {
        delete grills[i];
    }
}

bool GrillSystem::initialize_system() {

    // Create the mode manager instance
    modeManager = new ModeManager();

    // Grill instantiation & start
    for (int i = 0; i < GrillConstants::NUM_GRILLS; ++i) {
        grills[i] = new Grill(i, modeManager);
        if (grills[i]->setup_devices()) {
            Serial.println("The grill " + String(i) + " has been configured correctly");
            grills[i]->reset_system();
            grills[i]->subscribe_to_topics();
        } else {
            Serial.println("An error has occurred while configuring the devices of grill " + String(i));
            return false;
        }
    }
    
    // Initialize dual mode coordinator
    if (GrillConstants::NUM_GRILLS >= 2) {
        dualCoordinator = new DualModeCoordinator(grills[0], grills[1]);
    }
    
    return true;
}

void GrillSystem::update() {
    
    // Handle dual mode
    handle_dual_mode();
    
    // Handle rotor operations
    handle_rotor_operations();
    
    // Update individual grills
    update_individual_grills();
    
    // Handle temperature updates
    handle_temperature_updates();
}

Grill* GrillSystem::get_grill(int index) {
    if (index >= 0 && index < GrillConstants::NUM_GRILLS) {
        return grills[index];
    }
    return nullptr;
}

bool GrillSystem::is_dual_mode_active() {
    return dualCoordinator && dualCoordinator->is_dual_mode_active();
}

void GrillSystem::handle_dual_mode() {
    if (dualCoordinator) {
        dualCoordinator->update();
    }
}

void GrillSystem::update_individual_grills() {
    
    for (int i = 0; i < GrillConstants::NUM_GRILLS; ++i) {
        if (grills[i]) {

            // Handle the stop
            grills[i]->handle_position_stop();
           
            // Handle program steps
            grills[i]->update_program();    
        
            // Update Home Assistant states
            grills[i]->update_encoder(); 
        }
    }
}

void GrillSystem::handle_rotor_operations() {
    
    // Only the left grill has a rotor
    if (grills[0]) {
        grills[0]->handle_rotor_stop();
        grills[0]->update_rotor_encoder();
    }
}

void GrillSystem::handle_temperature_updates() {
    // Temperature handling (currently commented out in original)
    // Uncomment and modify as needed:
    
    // if (grills[0]) {
    //     grills[0]->handle_temperature_stop(); 
    //     
    //     // Temperatura irakutzeko pausa, MQTT ez kargatzeko.
    //     unsigned long currentMillisTemp = millis();
    //     if (currentMillisTemp - previousMillisTemp >= intervalTemp) {
    //         previousMillisTemp = currentMillisTemp;
    //         grills[0]->update_temperature(); // Kontuan euki ezkerreko parrillak bakarrik eukikoula pt100
    //     }
    // }
}
