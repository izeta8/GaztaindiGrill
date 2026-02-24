// This nested object provides a structured and type-safe way to access the new topic hierarchy.
export const TOPICS = {
  GLOBAL: {
    LWT: 'connection',
    LOG: 'log',
    RESET_STATUS: 'reset_status',
    CURRENT_MODE: 'current_mode'
  },
  ACTION: { // Commands from Client to ESP32
    MOVEMENT: {
      VERTICAL: 'action/movement/vertical',
      ROTATION: 'action/movement/rotation',
      SET_POSITION: 'action/movement/set_position',
      SET_ROTATION: 'action/movement/set_rotation',
    },
    PROGRAM: {
      EXECUTE: 'action/program/execute',
      CANCEL: 'action/program/cancel',
    },
    SYSTEM: {
      SET_MODE: 'action/system/set_mode',
      RESTART: 'action/system/restart',
    },
    REQUEST: {
      PROGRAM_STATUS: 'action/request/program_status'
    }
  },
  STATUS: { // State messages from ESP32 to Client
    SENSOR: {
      POSITION: 'status/sensor/position',
      ROTATION: 'status/sensor/rotation',
      TEMPERATURE: 'status/sensor/temperature',
    },
    PROGRAM: {
      CURRENT: 'status/program/current',
    },
  },
};

// --- MQTT PAYLOADS ---

// Command payloads
export const PAYLOAD_UP = "up";
export const PAYLOAD_DOWN = "down";
export const PAYLOAD_STOP = "stop";

export const PAYLOAD_CLOCKWISE = "clockwise";
export const PAYLOAD_COUNTER_CLOCKWISE = "counter_clockwise";

export const PAYLOAD_SINGLE = "single";
export const PAYLOAD_DUAL = "dual";