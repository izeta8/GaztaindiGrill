"use client"

import Head from 'next/head'
import { useState } from 'react'

export default function CreateProgram() {
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stepsJson: '',
    creatorName: ''
  })
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
   
    e.preventDefault()
    
    try {

      console.log("Request sent: ", formData);

      const response = await fetch('/api/programs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage('Registro insertado correctamente.')
        // router.push('/programs')
      } else {
        const errorData = await response.json()
        setMessage('Error al insertar el programa: ' + errorData?.message)
      }
    } catch (error) {
      setMessage('Error de conexión.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <>
      <Head>
        <title>Insertar Programa - Gaztaindi Grill</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main>
        <h1>Insertar Programa en PROGRAMAS_PARRILLA</h1>
        
        {message && <p>{message}</p>}
        
        <form onSubmit={handleSubmit}>

          <label htmlFor="name">Nombre:</label><br />
          <input 
            type="text" 
            id="name" 
            name="name" 
            value={formData.name}
            onChange={handleChange}
            required 
          /><br />
          
          <label htmlFor="description">Description:</label><br />
          <input 
            type="text" 
            id="description" 
            name="description" 
            value={formData.description}
            onChange={handleChange}
            required 
          /><br />
          
          <label htmlFor="stepsJson">StepsJson:</label><br />
          <textarea 
            id="stepsJson" 
            name="stepsJson" 
            value={formData.stepsJson}
            onChange={handleChange}
            required 
          /><br />
          
          <label htmlFor="creatorName">CreatorName:</label><br />
          <input 
            type="text" 
            id="creatorName" 
            name="creatorName" 
            value={formData.creatorName}
            onChange={handleChange}
            required 
          /><br />
          
          <br />
          
          <input type="submit" value="Insertar" />
        </form>
      </main>
    </>
  )
}
