#ifndef DUAL_MODE_COORDINATOR_H
#define DUAL_MODE_COORDINATOR_H

#include <ModeManager.h>

// Forward declaration to avoid circular dependency
class Grill;

class DualModeCoordinator {
public:
    DualModeCoordinator(Grill* grill0, Grill* grill1);
    
    // Verify if the dual mode is active
    bool is_dual_mode_active();
    
    // Handle all dual logic
    void handle_dual_movement();
    
    // Synchronize states between grills
    void synchronize_states();
    
private:
    Grill* grill0;
    Grill* grill1;
    
    // Verify if both are at top
    bool are_both_at_top();
    
    // Execute synchronized movement
    void execute_synchronized_movement(DualModeDirection direction);
    
};

#endif
