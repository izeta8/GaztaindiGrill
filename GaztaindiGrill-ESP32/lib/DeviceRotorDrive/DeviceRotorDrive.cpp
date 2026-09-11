

#include "DeviceRotorDrive.h"

DeviceRotorDrive::DeviceRotorDrive() {
    _pinIN3 = -1;
    _pinIN4 = -1;
    _pinENB = -1;
};

DeviceRotorDrive::DeviceRotorDrive(int pinIN3, int pinIN4, int pinENB) {
    _pinIN3 = pinIN3;
    _pinIN4 = pinIN4;
    _pinENB = pinENB;
    pinMode(_pinIN3, OUTPUT);
    pinMode(_pinIN4, OUTPUT);
    pinMode(_pinENB, OUTPUT);
    set_speed(255);
    stop();
};

void DeviceRotorDrive::stop(void) {
    digitalWrite(_pinIN3, LOW);
    digitalWrite(_pinIN4, LOW);
};

void DeviceRotorDrive::set_speed(uint8_t duty) {
    analogWrite(_pinENB, duty);
};

void DeviceRotorDrive::rotate_counter_clockwise(void) {
    digitalWrite(_pinIN3, HIGH);
    digitalWrite(_pinIN4, LOW);
};

void DeviceRotorDrive::rotate_clockwise(void) {
    digitalWrite(_pinIN3, LOW);
    digitalWrite(_pinIN4, HIGH);
};
