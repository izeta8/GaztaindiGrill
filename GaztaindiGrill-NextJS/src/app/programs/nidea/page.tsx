import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Program, ProgramStep } from '@/lib/types'

export default function ExecuteProgram() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data)
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds > 60) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes} min ${remainingSeconds} seg`
    }
    return `${seconds} seg`
  }

  const toggleSteps = (containerId: string) => {
    const listaPasos = document.querySelector(`#${containerId} .lista_pasos`) as HTMLElement
    if (listaPasos) {
      if (listaPasos.style.display === "none" || listaPasos.style.display === "") {
        listaPasos.style.display = "block"
      } else {
        listaPasos.style.display = "none"
      }
    }
  }

  const executeProgram = (pasosJSON: string) => {
    // SweetAlert confirmation (se cargará desde el script)
    if (typeof window !== 'undefined' && (window as any).Swal) {
      (window as any).Swal.fire({
        title: "¿Estás seguro que quieres ejecutar este programa?",
        text: "Asegúrate",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: 'Sí, ejecútalo!',
        cancelButtonText: 'No, cancelar!'
      }).then((result: any) => {
        if (result.isConfirmed) {
          (window as any).Swal.fire(
            '¡Ejecutado!',
            'El programa se ha ejecutado.',
            'success'
          )
          
          // Enviar MQTT message
          publishMQTT(pasosJSON)
        } else if (result.dismiss === (window as any).Swal.DismissReason.cancel) {
          (window as any).Swal.fire(
            'Cancelado',
            'La ejecución ha sido cancelada :)',
            'error'
          )
        }
      })
    }
  }

  const publishMQTT = (json: string) => {
    // MQTT logic will be handled by the script loaded in Head
    if (typeof window !== 'undefined' && (window as any).enviarMensaje) {
      (window as any).enviarMensaje(json)
    }
  }

  if (loading) return <div>Cargando programas...</div>

  return (
    <>
      <Head>
        <title>Ejecutar Programa - Gaztaindi Grill</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/css/styles.css" />
        <link rel="stylesheet" href="/css/sweetalert/sweetalert-dark.css" />
        <script src="/js/sweetalert.min.js"></script>
        <script src="/js/paho-mqtt.js"></script>
      </Head>

      <main>
        <h1>EJECUTAR PROGRAMA</h1>
        <div className="programs-container">
          {programs.map((programa) => {
            const idPrograma = programa.id
            const nombre = programa.name
            const descripcion = programa.description || 'Sin descripción'
            const fechaCreacion = programa.creationDate || 'N/A'
            const fechaActualizacion = programa.updateDate || 'N/A'
            const creador = programa.creatorName || 'Desconocido'
            const pasos = programa.stepsJSON
            
            let pasosArray: ProgramStep[] = []
            try {
              pasosArray = JSON.parse(pasos)
            } catch (e) {
              console.error('Error parsing JSON:', e)
            }

            return (
              <div key={idPrograma} className="contenedor" id={`programa-${idPrograma}`}>
                <div>
                  <h2>{nombre}</h2>
                  <span className="id_text">(#{idPrograma})</span>
                </div>

                <p className="descripcion">{descripcion}</p>

                <span>
                  ➔ <p className="ver_pasos" onClick={() => toggleSteps(`programa-${idPrograma}`)}>
                    Ver pasos
                  </p>
                </span>
                
                <ol className="lista_pasos" style={{ display: 'none' }}>
                  {pasosArray.map((paso, index) => {
                    const detallePaso: { [key: string]: any } = {}
                    let tiempo = ""

                    // Separar el tiempo del resto de los pasos
                    Object.entries(paso).forEach(([clave, valor]) => {
                      if (clave === "tiempo" && typeof valor === 'number') {
                        tiempo = formatTime(valor)
                      } else {
                        detallePaso[clave] = valor
                      }
                    })

                    return (
                      <li key={index}>
                        {Object.entries(detallePaso).map(([clave, valor]) => (
                          <div key={clave}>
                            {clave === "temperatura" && `Temperatura: ${valor}`}
                            {clave === "posicion" && `Posicion: ${valor}`}
                            {clave === "accion" && valor.toString().charAt(0).toUpperCase() + valor.toString().slice(1)}
                            
                            {tiempo && (clave === "temperatura" || clave === "posicion") && ` (${tiempo})`}
                            <br />
                          </div>
                        ))}
                      </li>
                    )
                  })}
                </ol>

                <p className="fecha_creacion">Fecha Creación: {fechaCreacion}</p>
                <p className="fecha_actualizacion">Fecha Actualización: {fechaActualizacion}</p>
                <p className="creador">{creador}</p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
                    className="btn-ejectuar"
                    onClick={() => executeProgram(pasos)}
                  >
                    EJECUTAR PROGRAMA
                  </button>
                  
                  <Link href={`/programs/${idPrograma}/edit`}>
                    <button className="btn-editar" style={{ backgroundColor: '#4CAF50' }}>
                      EDITAR
                    </button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <script dangerouslySetInnerHTML={{
        __html: `
          // MQTT Configuration
          const mqttServer = "192.168.68.64";
          const wsPort = 1884;
          const mqttUser = "gaztaindi";
          const mqttPassword = "gaztaindi";

          // Create MQTT client
          const client = new Paho.MQTT.Client(mqttServer, Number(wsPort), "clientId");

          // Callbacks
          client.onConnectionLost = (responseObject) => {
            if (responseObject.errorCode !== 0) {
              console.log("Conexión perdida:" + responseObject.errorMessage);
            }
          };

          client.onMessageArrived = (message) => {
            console.log("Mensaje recibido:" + message.payloadString);
          };

          const onConnect = () => {
            console.log("Conectado");
          };

          const onFailure = (message) => {
            console.log("Fallo en la conexión:" + message.errorMessage);
          };

          // Connect to broker
          client.connect({
            onSuccess: onConnect,
            onFailure: onFailure,
            userName: mqttUser,
            password: mqttPassword,
            useSSL: false
          });

          // Function to send JSON program
          const enviarMensaje = (json) => {
            const message = new Paho.MQTT.Message(json);
            message.destinationName = "grill/0/ejecutar_programa";
            client.send(message);
            console.log("Mensaje enviado: " + json);
          };

          // Make function available globally
          window.enviarMensaje = enviarMensaje;
        `
      }} />
    </>
  )
}
