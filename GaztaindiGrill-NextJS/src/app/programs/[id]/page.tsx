import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Program } from '@/lib/types'

export default function EditProgram() {
  const router = useRouter()
  const { id } = router.query
  const [program, setProgram] = useState<Program | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    pasosJSON: '',
    cantidadUsos: 0,
    fechaActualizacion: new Date().toISOString().split('T')[0],
    activo: 1
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && !Array.isArray(id)) {
      fetchProgram(id)
    }
  }, [id])

  const fetchProgram = async (programId: string) => {
    try {
      const response = await fetch(`/api/programs/${programId}`)
      if (response.ok) {
        const data: Program = await response.json()
        setProgram(data)
        setFormData({
          nombre: data.name,
          descripcion: data.description || '',
          pasosJSON: data.stepsJson,
          cantidadUsos: data.usageCount,
          fechaActualizacion: new Date().toISOString().split('T')[0],
          activo: data.isActive
        })
      } else {
        setMessage('Error al cargar el programa.')
      }
    } catch (error) {
      setMessage('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!id || Array.isArray(id)) return

    try {
      const response = await fetch(`/api/programs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage('Programa actualizado correctamente.')
        // Opcional: redirigir después de actualizar
        // router.push('/programs')
      } else {
        setMessage('Error al actualizar el programa.')
      }
    } catch (error) {
      setMessage('Error de conexión.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cantidadUsos' || name === 'activo' ? parseInt(value) || 0 : value
    }))
  }

  const handleDelete = async () => {
    if (!id || Array.isArray(id)) return

    if (confirm('¿Estás seguro de que quieres eliminar este programa?')) {
      try {
        const response = await fetch(`/api/programs/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setMessage('Programa eliminado correctamente.')
          setTimeout(() => {
            router.push('/programs')
          }, 2000)
        } else {
          setMessage('Error al eliminar el programa.')
        }
      } catch (error) {
        setMessage('Error de conexión.')
      }
    }
  }

  if (loading) return <div>Cargando programa...</div>
  if (!program) return <div>Programa no encontrado.</div>

  return (
    <>
      <Head>
        <title>Editar Programa - Gaztaindi Grill</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main>
        <h1>Editar Programa #{program.id}</h1>
        
        {message && <p>{message}</p>}
        
        <form onSubmit={handleSubmit}>
          <label htmlFor="nombre">Nombre:</label><br />
          <input 
            type="text" 
            id="nombre" 
            name="nombre" 
            value={formData.nombre}
            onChange={handleChange}
            required 
          /><br />
          
          <label htmlFor="descripcion">Descripción:</label><br />
          <textarea 
            id="descripcion" 
            name="descripcion" 
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
            cols={50}
          /><br />
          
          <label htmlFor="pasosJSON">PasosJSON:</label><br />
          <textarea 
            id="pasosJSON" 
            name="pasosJSON" 
            value={formData.pasosJSON}
            onChange={handleChange}
            rows={10}
            cols={50}
            required 
          /><br />
          
          <label htmlFor="cantidadUsos">CantidadUsos:</label><br />
          <input 
            type="number" 
            id="cantidadUsos" 
            name="cantidadUsos" 
            value={formData.cantidadUsos}
            onChange={handleChange}
            required 
          /><br />
          
          <label htmlFor="fechaActualizacion">FechaActualización:</label><br />
          <input 
            type="date" 
            id="fechaActualizacion" 
            name="fechaActualizacion" 
            value={formData.fechaActualizacion}
            onChange={handleChange}
            required 
          /><br />
          
          <label htmlFor="activo">Activo:</label><br />
          <select 
            id="activo" 
            name="activo" 
            value={formData.activo}
            onChange={handleChange}
            required 
          >
            <option value={1}>Sí</option>
            <option value={0}>No</option>
          </select><br /><br />
          
          <input type="submit" value="Actualizar" />
          <button type="button" onClick={handleDelete} style={{ marginLeft: '10px', backgroundColor: 'red' }}>
            Eliminar Programa
          </button>
        </form>

        <div style={{ marginTop: '20px' }}>
          <h3>Información del Programa:</h3>
          <p><strong>Fecha Creación:</strong> {program.creationDate}</p>
          <p><strong>Creador:</strong> {program.creatorName}</p>
          <p><strong>Última Actualización:</strong> {program.updateDate}</p>
        </div>
      </main>
    </>
  )
}
