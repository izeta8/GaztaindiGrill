#ifndef DUAL_MODE_COORDINATOR_H
#define DUAL_MODE_COORDINATOR_H

#include <ModeManager.h>

// Forward declaration to avoid circular dependency
class Grill;

enum DualResetState {
    IDLE,
    RESETTING,  
    READY
};


class DualModeCoordinator {
public:
    DualModeCoordinator(Grill* grill0, Grill* grill1);
    
    // Verify if the dual mode is active
    bool is_dual_mode_active();
    
    // States machine logic
    void update();

    // Inicia la secuencia de reseteo
    void start_reset_sequence();
    
private:
    Grill* grill0;
    Grill* grill1;
    DualResetState resetState;
    
    bool are_both_at_top();
    void execute_synchronized_movement(DualModeDirection direction);
    
};

#endif
