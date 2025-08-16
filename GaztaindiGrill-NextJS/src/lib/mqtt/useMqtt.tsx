"use client"

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import mqtt, { IClientOptions, MqttClient, IClientPublishOptions } from 'mqtt'

type MqttContextValue = {
  client: MqttClient | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  publish: (topic: string, payload: string, options?: IClientPublishOptions) => Promise<void>
  subscribe: (topic: string, handler: (topic: string, payload: Uint8Array) => void) => Promise<() => void>
}

const MqttContext = createContext<MqttContextValue | undefined>(undefined)

function buildUrlAndOptions() {
  const host = process.env.NEXT_PUBLIC_MQTT_SERVER
  const envPort = process.env.NEXT_PUBLIC_MQTT_PORT
  const envProtocol = process.env.NEXT_PUBLIC_MQTT_PROTOCOL
  const protocol = envProtocol || (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws')
  const path = process.env.NEXT_PUBLIC_MQTT_PATH || ''
  const username = process.env.NEXT_PUBLIC_MQTT_USER
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD
  const clientIdPrefix = process.env.NEXT_PUBLIC_MQTT_CLIENT_ID_PREFIX || 'gaztaindi-web'

  if (!host) throw new Error('Missing NEXT_PUBLIC_MQTT_SERVER')
  const port = envPort || (protocol === 'wss' ? '8884' : '1884')
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  const url = `${protocol}://${host}:${port}${normalizedPath}`

  const options: IClientOptions = {
    clientId: `${clientIdPrefix}-${Math.random().toString(16).slice(2, 10)}`,
    keepalive: 30,
    reconnectPeriod: 2000, // auto reconnect globally
    clean: true,
    protocolVersion: 4,
    username: username || undefined,
    password: password || undefined,
  }

  return { url, options }
}

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<MqttClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handlersRef = useRef(new Map<string, Set<(topic: string, payload: Uint8Array) => void>>())

  useEffect(() => {
    let mounted = true
    try {
      const { url, options } = buildUrlAndOptions()
      setIsConnecting(true)
      const c = mqtt.connect(url, options)
      if (process.env.NODE_ENV !== 'production') {
        console.info('[MQTT] Global connect', { url })
      }
      c.on('connect', () => { if (!mounted) return; setIsConnected(true); setIsConnecting(false); setError(null) })
      c.on('reconnect', () => { if (!mounted) return; setIsConnecting(true) })
      c.on('close', () => { if (!mounted) return; setIsConnected(false) })
      c.on('error', (err) => { if (!mounted) return; setError(err?.message || 'MQTT error') })
      c.on('message', (topic, payload) => {
        const set = handlersRef.current.get(topic)
        if (!set) return
        set.forEach(fn => fn(topic, payload))
      })
      setClient(c)
      return () => { mounted = false; try { c.end(true) } catch { /* noop */ } }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Config error')
    }
  }, [])

  const value = useMemo<MqttContextValue>(() => ({
    client,
    isConnected,
    isConnecting,
    error,
    publish: async (topic, payload, options) => {
      if (!client || !isConnected) throw new Error('MQTT no conectado')
      await new Promise<void>((resolve, reject) => {
        client.publish(topic, payload, { qos: 1, ...options }, (err?: Error | null) => {
          if (err) return reject(err)
          resolve()
        })
      })
    },
    subscribe: async (topic, handler) => {
      if (!client) throw new Error('MQTT no inicializado')
      await new Promise<void>((resolve, reject) => {
        client.subscribe(topic, { qos: 0 }, (err) => err ? reject(err) : resolve())
      })
      let set = handlersRef.current.get(topic)
      if (!set) { set = new Set(); handlersRef.current.set(topic, set) }
      set.add(handler)
      return () => {
        const s = handlersRef.current.get(topic)
        if (s) { s.delete(handler); if (s.size === 0) handlersRef.current.delete(topic) }
        // We keep the subscription open; advanced optimization omitted to keep it simple.
      }
    },
  }), [client, isConnected, isConnecting, error])

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>
}

export function useMqtt() {
  const ctx = useContext(MqttContext)
  if (!ctx) throw new Error('useMqtt must be used within MqttProvider')
  return ctx
}
