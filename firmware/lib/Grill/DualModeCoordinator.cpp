#include "DualModeCoordinator.h"
#include "Grill.h"

DualModeCoordinator::DualModeCoordinator(Grill* grill0, Grill* grill1) 
    : grill0(grill0), grill1(grill1) {
}

bool DualModeCoordinator::is_dual_mode_active() {
    return grill0->get_mode() == DUAL;
}

void DualModeCoordinator::handle_dual_movement() {
    
    if (!is_dual_mode_active()) {
        return;
    }
    
    // Synchronize states
    synchronize_states();
    
    // Get direction from master grill (grill0)
    DualModeDirection direction = grill0->get_dual_direction();
    
    // Execute synchronized movement
    execute_synchronized_movement(direction);
}

void DualModeCoordinator::synchronize_states() {
    bool bothAtTop = are_both_at_top();
    grill0->set_is_at_top_dual(bothAtTop); // Only grill0 manages dual state
}

bool DualModeCoordinator::are_both_at_top() {
    return grill0->is_at_top() && grill1->is_at_top();
}

void DualModeCoordinator::execute_synchronized_movement(DualModeDirection direction) {
    switch (direction) {
        case UPWARDS:
            grill0->go_up();
            grill1->go_up();
            break;
        case STILL:
            grill0->stop_lineal_actuator();
            grill1->stop_lineal_actuator();
            break;
        case DOWNWARDS:
            grill0->go_down();
            grill1->go_down();
            break;
    }
}