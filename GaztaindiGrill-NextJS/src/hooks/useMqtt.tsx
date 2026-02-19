"use client"

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import mqtt, { IClientOptions, MqttClient, IClientPublishOptions } from 'mqtt'
import { ConnectionStatus, ResetStatus } from '@/types'
import { toast } from 'sonner'
import { TOPICS } from '@/constants/mqtt'

type MqttContextValue = {
  client: MqttClient | null
  espConnectionStatus: ConnectionStatus
  clientConnectionStatus: ConnectionStatus
  resetStatus: ResetStatus
  error: string | null
  publish: (topic: string, payload: string, options?: IClientPublishOptions) => Promise<void>
  subscribe: (topic: string, handler: (topic: string, payload: Uint8Array) => void) => Promise<() => void>
}

const MqttContext = createContext<MqttContextValue | undefined>(undefined)

function buildUrlAndOptions() {
  const host = process.env.NEXT_PUBLIC_MQTT_SERVER
  const envPort = process.env.NEXT_PUBLIC_MQTT_PORT
  const envProtocol = process.env.NEXT_PUBLIC_MQTT_PROTOCOL
  const protocol =
    envProtocol ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws')
  const path = process.env.NEXT_PUBLIC_MQTT_PATH || ''
  const username = process.env.NEXT_PUBLIC_MQTT_USER
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD

  if (!host) throw new Error('Missing NEXT_PUBLIC_MQTT_SERVER')
  const port = envPort || (protocol === 'wss' ? '8884' : '1884')
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  const url = `${protocol}://${host}:${port}${normalizedPath}`

  const options: IClientOptions = {
    clientId: `gaztaindiNextjs-${Math.random().toString(16).slice(2, 10)}`,
    keepalive: 20,
    reconnectPeriod: 2000,
    clean: true,
    protocolVersion: 4,
    username: username,
    password: password,
  }

  return { url, options }
}

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<MqttClient | null>(null)
  const [espConnectionStatus, setEspConnectionStatus] = useState(ConnectionStatus.Connecting)
  const [clientConnectionStatus, setClientConnectionStatus] = useState(ConnectionStatus.Connecting)
  const [resetStatus, setResetStatus] = useState(ResetStatus.Resetting)
  const [error, setError] = useState<string | null>(null)
  const handlersRef = useRef(new Map<string, Set<(topic: string, payload: Uint8Array) => void>>())

  // References to keep the functions stable without loosing the current state 
  const espStatusRef = useRef(espConnectionStatus)
  const clientStatusRef = useRef(clientConnectionStatus)

  useEffect(() => {
    espStatusRef.current = espConnectionStatus
    clientStatusRef.current = clientConnectionStatus
  }, [espConnectionStatus, clientConnectionStatus])

  useEffect(() => {
    let mounted = true
    let c: MqttClient | null = null

    try {
      const { url, options } = buildUrlAndOptions()
      setEspConnectionStatus(ConnectionStatus.Connecting)
      c = mqtt.connect(url, options)

      c.on('connect', () => {
        if (!mounted) return
        console.log('[MQTT] Client connected to broker')
        setClientConnectionStatus(ConnectionStatus.Online)
        setError(null)
        
        // Subscribe to LWT topic
        c?.subscribe(`grill/${TOPICS.GLOBAL.LWT}`, (err) => {
          if (err) console.error(`[MQTT] Failed to subscribe to grill/${TOPICS.GLOBAL.LWT}`, err)
        })

        // Subscribe to reset status topic
        c?.subscribe(`grill/${TOPICS.GLOBAL.RESET_STATUS}`, (err) => {
          if (err) console.error(`[MQTT] Failed to subscribe to grill/${TOPICS.GLOBAL.RESET_STATUS}`, err)
        })
      })

      c.on('reconnect', () => {
        if (!mounted) return
        console.log('[MQTT] Reconnecting...')
        setClientConnectionStatus(ConnectionStatus.Connecting)
      })

      c.on('close', () => {
        if (!mounted) return
        console.log("[MQTT] Connection closed")
        setClientConnectionStatus(ConnectionStatus.Offline)
      })

      c.on('error', (err) => {
        if (!mounted) return
        console.error('[MQTT] Error:', err)
        setError(err?.message || 'MQTT error')
      })

      c.on('message', (topic, payload) => {

        if (!mounted) return
        const msg = payload.toString()
        console.log(`[MQTT] Message received on topic "${topic}": ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
        
        if (topic === `grill/${TOPICS.GLOBAL.LWT}`) {
          const connectionStatus = msg === ConnectionStatus.Online ? ConnectionStatus.Online : ConnectionStatus.Offline
          setEspConnectionStatus(connectionStatus)
        }

        if (topic === `grill/${TOPICS.GLOBAL.RESET_STATUS}`) {
          const resetStatus = msg === ResetStatus.Ready ? ResetStatus.Ready : ResetStatus.Resetting
          setResetStatus(resetStatus)
        }

        const handlersSet = handlersRef.current.get(topic)
        if (handlersSet) {
          handlersSet.forEach((fn) => {
            try {
              fn(topic, payload)
            } catch (handlerError) {
              console.error(`[MQTT] Error executing handler for topic ${topic}:`, handlerError)
            }
          })
        }
      })

      setClient(c)
      return () => {
        mounted = false
        if (c && c.connected) {
          c.end(true)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Config error')
    }
  }, [])

  const publish = useCallback(async (topic: string, payload: string, options?: IClientPublishOptions) => {
    if (!client) throw new Error('MQTT client not initialized')
    if (clientStatusRef.current !== ConnectionStatus.Online) throw new Error('MQTT client not connected')
    
    if (espStatusRef.current !== ConnectionStatus.Online && topic !== TOPICS.GLOBAL.LWT) {
      console.warn(`[MQTT] Attempting to publish to "${topic}" while ESP32 status is ${espStatusRef.current}`)
      toast.warning("Se ha enviado una orden a la parrilla pero está apagada.")
    }

    console.log(`[MQTT] Publishing to "${topic}": ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`)
    await new Promise<void>((resolve, reject) => {
      client.publish(topic, payload, { qos: 1, ...options }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }, [client])

  const subscribe = useCallback(async (topic: string, handler: (topic: string, payload: Uint8Array) => void) => {
    if (!client) throw new Error('MQTT client not initialized')

    await new Promise<void>((resolve, reject) => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    let set = handlersRef.current.get(topic)
    if (!set) {
      set = new Set()
      handlersRef.current.set(topic, set)
    }
    set.add(handler)

    return () => {
      const s = handlersRef.current.get(topic)
      if (s) {
        s.delete(handler)
        if (s.size === 0) {
          handlersRef.current.delete(topic)
          if (client && client.connected) {
            client.unsubscribe(topic)
          }
        }
      }
    }
  }, [client])

  const value = useMemo(() => ({
    client,
    espConnectionStatus,
    clientConnectionStatus,
    resetStatus,
    error,
    publish,
    subscribe
  }), [client, espConnectionStatus, clientConnectionStatus, resetStatus, error, publish, subscribe])

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>
}

export function useMqtt() {
  const ctx = useContext(MqttContext)
  if (!ctx) throw new Error('useMqtt must be used within MqttProvider')
  return ctx
}