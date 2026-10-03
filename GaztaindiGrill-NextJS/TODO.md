
DOING: 

- Implementar reseteo: 
    * Opción para reiniciar toda la parrilla (falta compo)

- Go-To sliderrak controlan albuan jarri


TODO: 

- Sistema de notificaciones globales. Cuando se ejecute un programa avisar a todos los usuarios...
- Fix last update del control de las parrillas
- Bloquear la posibilidad de ejecutar un programa que contenga rotación en la parrilla derecha.
  El firmware ignora esos pasos sin avisar. `planSimulation()` ya sabe que la derecha no tiene
  rotor (`hasRotor`), así que el aviso puede salir en `stepNotice()` como los demás.
- `scripts/fake-grill.mjs` no aplica el suelo por inclinación ni sube antes de girar en los
  programas, a diferencia del firmware: con él, los avisos ámbar no coinciden con lo que hace.