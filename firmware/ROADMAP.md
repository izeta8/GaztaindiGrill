# 🗺️ Arduino Grill Project - SRP Refactoring Roadmap

## 📖 Introducción

Este roadmap te guiará paso a paso en la refactorización de la clase monolítica `Grill` aplicando el **Principio de Responsabilidad Única (SRP)**. El objetivo es separar las diferentes responsabilidades en clases especializadas para mejorar la mantenibilidad, testabilidad y claridad del código.

## 🎯 Principios Clave del SRP

### ¿Qué es el SRP?
- **Una clase debe tener una sola razón para cambiar**
- **Alta cohesión** dentro de cada clase
- **Bajo acoplamiento** entre clases
- **Interfaces claras** y bien definidas

### ¿Por qué refactorizar?
- **Mantenibilidad**: Cambios en una funcionalidad no afectan otras
- **Testabilidad**: Cada clase se puede probar independientemente
- **Reutilización**: Componentes pueden usarse en otros contextos
- **Claridad**: El código es más fácil de entender y modificar

## 📊 Estado Actual

La clase `Grill` (~600 líneas) tiene múltiples responsabilidades:
- ✅ **Hardware Management**: Setup y control de dispositivos físicos
- ✅ **Sensor Management**: Lectura y publicación de sensores
- ✅ **Movement Control**: Control de actuadores y posicionamiento
- ✅ **MQTT Communication**: Comunicación y logging (YA EXTRAÍDO)
- ✅ **Program Execution**: Ejecución de secuencias programadas (YA EXTRAÍDO)

## 🚀 Plan de Refactorización - 5 Fases

### Fase 1: GrillHardware 🔧
**Responsabilidad**: Manejo de dispositivos físicos y configuración de hardware

#### Métodos a extraer:
- `setup_devices()`
- `reset_devices()`
- `reset_encoder()`
- `reset_rotor_drive()`

#### Variables a extraer:
- `DeviceEncoder* encoder`
- `DeviceRotorDrive* rotorDrive`
- `DeviceLinealActuator* linealActuator`
- `DeviceLimitSwitch* limitSwitch`
- `DeviceThermocouple* thermocouple`

#### Interface sugerida:
```cpp
class GrillHardware {
private:
    int grillIndex;
    DeviceEncoder* encoder;
    DeviceRotorDrive* rotorDrive;
    DeviceLinealActuator* linealActuator;
    DeviceLimitSwitch* limitSwitch;
    DeviceThermocouple* thermocouple;

public:
    GrillHardware(int index);
    bool setupDevices();
    void resetDevices();
    void resetEncoder();
    void resetRotorDrive();
    
    // Getters para acceso controlado
    DeviceEncoder* getEncoder() const;
    DeviceRotorDrive* getRotorDrive() const;
    DeviceLinealActuator* getLinealActuator() const;
    DeviceLimitSwitch* getLimitSwitch() const;
    DeviceThermocouple* getThermocouple() const;
};
```

---

### Fase 2: GrillSensors 📊
**Responsabilidad**: Lectura de sensores y publicación de actualizaciones

#### Métodos a extraer:
- `read_sensors()`
- `publish_sensors_update()`

#### Variables a extraer:
- `float temperature`
- `float position`
- `float rotation`
- `bool limitSwitchPressed`

#### Interface sugerida:
```cpp
class GrillSensors {
private:
    GrillHardware* hardware;
    GrillMQTT* mqtt;
    float temperature;
    float position;
    float rotation;
    bool limitSwitchPressed;

public:
    GrillSensors(GrillHardware* hw, GrillMQTT* mqttHandler);
    void readSensors();
    void publishSensorsUpdate();
    
    // Getters
    float getTemperature() const;
    float getPosition() const;
    float getRotation() const;
    bool isLimitSwitchPressed() const;
};
```

---

### Fase 3: GrillMovement 🎮
**Responsabilidad**: Control de movimientos y posicionamiento

#### Métodos a extraer:
- `go_up()`
- `go_down()`
- `stop_lineal_actuator()`
- `go_to_position()`
- `rotate_clockwise()`
- `rotate_counterclockwise()`
- `stop_rotor()`
- `rotate_to_angle()`

#### Variables a extraer:
- `float targetPosition`
- `float targetRotation`
- `bool targetReached`

#### Interface sugerida:
```cpp
class GrillMovement {
private:
    GrillHardware* hardware;
    GrillSensors* sensors;
    GrillMQTT* mqtt;
    float targetPosition;
    float targetRotation;
    bool targetReached;

public:
    GrillMovement(GrillHardware* hw, GrillSensors* sens, GrillMQTT* mqttHandler);
    
    // Movimiento lineal
    void goUp();
    void goDown();
    void stopLinealActuator();
    void goToPosition(float position);
    
    // Movimiento rotacional
    void rotateClockwise();
    void rotateCounterclockwise();
    void stopRotor();
    void rotateToAngle(float angle);
    
    // Estado
    bool isTargetReached() const;
    float getTargetPosition() const;
    float getTargetRotation() const;
};
```

---

### Fase 4: GrillMQTT 📡 ✅ **COMPLETADO**
**Responsabilidad**: Comunicación MQTT y logging

*Esta fase ya está completada. La clase `GrillMQTT` maneja toda la comunicación MQTT.*

---

### Fase 5: GrillProgram 🎬 ✅ **COMPLETADO**
**Responsabilidad**: Ejecución de programas y secuencias

*Esta fase ya está completada. La clase `GrillProgram` maneja la ejecución de programas.*

---

## 📋 Metodología Paso a Paso

### Para cada fase:

#### 1. 📝 **Planificación** (15-30 min)
- [ ] Identifica métodos y variables a extraer
- [ ] Define la interface de la nueva clase
- [ ] Identifica dependencias con otras clases
- [ ] Planifica cómo `Grill` delegará responsabilidades

#### 2. 🏗️ **Implementación** (30-60 min)
- [ ] Crea archivos `.h` y `.cpp` para la nueva clase
- [ ] Implementa constructor y métodos básicos
- [ ] Mueve métodos desde `Grill` a la nueva clase
- [ ] Actualiza `Grill.h` para incluir la nueva clase
- [ ] Modifica `Grill.cpp` para delegar llamadas

#### 3. 🔧 **Integración** (15-30 min)
- [ ] Actualiza constructor de `Grill` para inicializar nueva clase
- [ ] Reemplaza llamadas directas por delegación
- [ ] Ajusta acceso a variables (getters/setters si es necesario)

#### 4. ✅ **Verificación** (15 min)
- [ ] Compila el proyecto sin errores
- [ ] Verifica que la funcionalidad se mantiene
- [ ] Haz commit de los cambios

## 🎯 Orden Recomendado de Implementación

### Opción A: Por Dependencias (Recomendado)
1. **GrillHardware** - Base, sin dependencias
2. **GrillMQTT** - ✅ Ya completado
3. **GrillSensors** - Depende de Hardware y MQTT
4. **GrillMovement** - Depende de Hardware y Sensors
5. **GrillProgram** - ✅ Ya completado

### Opción B: Por Complejidad
1. **GrillHardware** - Más simple, solo setup
2. **GrillMQTT** - ✅ Ya completado
3. **GrillSensors** - Complejidad media
4. **GrillMovement** - Más complejo, lógica de control
5. **GrillProgram** - ✅ Ya completado

## 📊 Checklist de Progreso

### Estado Actual:
- [x] **Análisis inicial completado**
- [x] **GrillMQTT extraído y funcionando**
- [x] **GrillProgram extraído y funcionando**
- [ ] **GrillHardware** - ⏳ Siguiente fase
- [ ] **GrillSensors** - 🔄 Pendiente
- [ ] **GrillMovement** - 🔄 Pendiente

### Para cada fase:
- [ ] Planificación completada
- [ ] Interface definida
- [ ] Archivos `.h` y `.cpp` creados
- [ ] Métodos movidos y funcionando
- [ ] `Grill` actualizado para delegar
- [ ] Compilación exitosa
- [ ] Funcionalidad verificada
- [ ] Commit realizado

## 💡 Consejos y Mejores Prácticas

### ✅ Do's:
- **Haz cambios pequeños e incrementales**
- **Compila después de cada cambio importante**
- **Usa nombres descriptivos para métodos y variables**
- **Mantén interfaces simples y claras**
- **Documenta las dependencias entre clases**
- **Haz commit frecuentemente con mensajes descriptivos**

### ❌ Don'ts:
- **No muevas todo de una vez**
- **No cambies la funcionalidad durante la refactorización**
- **No te compliques con smart pointers por ahora**
- **No agregues nuevas features durante el refactor**
- **No ignores errores de compilación**

## 🔍 Ejemplo Detallado: GrillHardware

### Paso 1: Crear GrillHardware.h
```cpp
#ifndef GRILL_HARDWARE_H
#define GRILL_HARDWARE_H

#include "DeviceEncoder.h"
#include "DeviceRotorDrive.h"
#include "DeviceLinealActuator.h"
#include "DeviceLimitSwitch.h"
#include "DeviceThermocouple.h"

class GrillHardware {
private:
    int grillIndex;
    DeviceEncoder* encoder;
    DeviceRotorDrive* rotorDrive;
    DeviceLinealActuator* linealActuator;
    DeviceLimitSwitch* limitSwitch;
    DeviceThermocouple* thermocouple;

public:
    GrillHardware(int index);
    bool setupDevices();
    void resetDevices();
    void resetEncoder();
    void resetRotorDrive();
    
    // Getters
    DeviceEncoder* getEncoder() const { return encoder; }
    DeviceRotorDrive* getRotorDrive() const { return rotorDrive; }
    DeviceLinealActuator* getLinealActuator() const { return linealActuator; }
    DeviceLimitSwitch* getLimitSwitch() const { return limitSwitch; }
    DeviceThermocouple* getThermocouple() const { return thermocouple; }
};

#endif
```

### Paso 2: Implementar GrillHardware.cpp
```cpp
#include "GrillHardware.h"
#include "../GRILL_Modules/GRILL_config.h"

GrillHardware::GrillHardware(int index) : grillIndex(index) {
    encoder = nullptr;
    rotorDrive = nullptr;
    linealActuator = nullptr;
    limitSwitch = nullptr;
    thermocouple = nullptr;
}

bool GrillHardware::setupDevices() {
    // Mover lógica desde Grill::setup_devices()
    // ...
}

// Implementar resto de métodos...
```

### Paso 3: Actualizar Grill.h
```cpp
#include "GrillHardware.h"

class Grill {
private:
    GrillHardware* hardware;
    // ... otros miembros

public:
    // Métodos de delegación
    bool setup_devices() { return hardware->setupDevices(); }
    void reset_devices() { hardware->resetDevices(); }
    // ...
};
```

## 📚 Recursos de Aprendizaje

### Conceptos Clave:
- **Single Responsibility Principle (SRP)**
- **Composition over Inheritance**
- **Dependency Injection**
- **Interface Segregation**

### Lecturas Recomendadas:
- Clean Code - Robert C. Martin (Capítulos sobre SRP)
- Effective C++ - Scott Meyers
- C++ Core Guidelines (especialmente sobre ownership)

## 🎉 Resultado Final Esperado

Al completar todas las fases tendrás:

### Estructura Final:
```
Grill/
├── Grill.h/.cpp           # Coordinador principal (mucho más pequeño)
├── GrillHardware.h/.cpp   # Manejo de dispositivos físicos
├── GrillSensors.h/.cpp    # Lectura y publicación de sensores
├── GrillMovement.h/.cpp   # Control de movimientos
├── GrillMQTT.h/.cpp       # Comunicación MQTT ✅
└── GrillProgram.h/.cpp    # Ejecución de programas ✅
```

### Beneficios Obtenidos:
- ✅ **Código más mantenible** - Cambios localizados
- ✅ **Mejor testabilidad** - Cada clase se puede probar independientemente
- ✅ **Mayor claridad** - Responsabilidades bien definidas
- ✅ **Reutilización** - Componentes pueden usarse en otros contextos
- ✅ **Facilita extensiones** - Agregar nuevas funcionalidades es más fácil

---

## 🚀 ¡Empezemos!

**Siguiente paso recomendado**: Comenzar con **GrillHardware** siguiendo la metodología paso a paso descrita arriba.

¿Estás listo para empezar? ¡Recuerda que el aprendizaje viene de la práctica! 💪
