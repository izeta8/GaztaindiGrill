
DOING: 

- Implementar reseteo: 
    * Opción para reiniciar toda la parrilla (falta compo)

- Go-To sliderrak controlan albuan jarri


TODO: 

- Sistema de notificaciones globales. Cuando se ejecute un programa avisar a todos los usuarios...
- Fix last update del control de las parrillas
- Bloquear la posibilidad de ejecutar un programa que contenga rotación en la parrilla derecha.
- Contador de tiempo en la ejecución. El firmware ya publica `stepStartUnix` en el paso actual,
  pero no lo lee ningún componente: solo aparece en `types/program.ts` y en el simulador.
  Cobra sentido sobre todo en los pasos de espera.