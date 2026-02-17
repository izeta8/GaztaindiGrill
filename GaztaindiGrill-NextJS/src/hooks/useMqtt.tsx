"use client"

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import mqtt, { IClientOptions, MqttClient, IClientPublishOptions } from 'mqtt'
import { ConnectionStatus } from '@/types'
import { toast } from 'sonner'

type MqttContextValue = {
  client: MqttClient | null
  espConnectionStatus: ConnectionStatus
  clientConnectionStatus: ConnectionStatus
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
    reconnectPeriod: 2000, // auto reconnect globally
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
  const [error, setError] = useState<string | null>(null)
  const handlersRef = useRef(
    new Map<string, Set<(topic: string, payload: Uint8Array) => void>>()
  )

  useEffect(() => {
    let mounted = true
    let c: MqttClient | null = null;

    try {
      const { url, options } = buildUrlAndOptions()
      setEspConnectionStatus(ConnectionStatus.Connecting)
      c = mqtt.connect(url, options)
      if (process.env.NODE_ENV !== 'production') {
        console.info('[MQTT] Global connect', { url })
      }
      c.on('connect', () => {
        if (!mounted) return
        console.log('[MQTT] Client connected to broker');
        setClientConnectionStatus(ConnectionStatus.Connected)
        setError(null)

        // Subscribe to ESP32 status topic (Last Will Testament)
        c?.subscribe('grill/status', (err) => {
           if (err) console.error('[MQTT] Failed to subscribe to grill/status:', err);
           else console.log('[MQTT] Subscribed to grill/status for LWT');
        });
      })
      c.on('reconnect', () => {
        if (!mounted) return
        console.log('[MQTT] Reconnecting...');
        setClientConnectionStatus(ConnectionStatus.Connecting)
      })
      c.on('close', () => {
        if (!mounted) return
        console.log("[MQTT] Connection closed");
        setClientConnectionStatus(ConnectionStatus.Offline)
      })
      c.on('error', (err) => {
        if (!mounted) return
        console.error('[MQTT] Error:', err);
        setError(err?.message || 'MQTT error')
      })


      c.on('message', (topic, payload) => {
        if (!mounted) return;
        const msg = payload.toString();
        console.log(`[MQTT] Message received on topic "${topic}": ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);

        // Handle LWT status
        if (topic === 'grill/status') {
          const connectionStatus = msg === 'online' ? ConnectionStatus.Connected : ConnectionStatus.Offline
          console.log(`[MQTT] ESP32 status update: ${msg} -> ${connectionStatus}`);
          setEspConnectionStatus(connectionStatus)
        }

        const handlersSet = handlersRef.current.get(topic);
        if (handlersSet) {
            handlersSet.forEach((fn) => {
              try {
                fn(topic, payload);
              } catch (handlerError) {
                console.error(`[MQTT] Error executing handler for topic ${topic}:`, handlerError);
              }
            });
        }
      })


      setClient(c)
      return () => {
        mounted = false
        console.log('[MQTT] Cleaning up MQTT connection...');
        try {
          if (c && c.connected) { // Check if client exists and is connected before ending
             c.end(true, () => {
                 console.log('[MQTT] Connection ended.');
             });
          }
        } catch (e) {
            console.error('[MQTT] Error during cleanup:', e);
        }
      }
    } catch (e) {
      console.error('[MQTT] Setup error:', e);
      setError(e instanceof Error ? e.message : 'Config error')
    }
  }, [])

  const value = useMemo<MqttContextValue>(
    () => ({
      client,
      espConnectionStatus,
      clientConnectionStatus,
      error,
      publish: async (topic, payload, options) => {
        if (!client) throw new Error('MQTT client not initialized')
        if (clientConnectionStatus !== ConnectionStatus.Connected) throw new Error('MQTT client not connected')
        if (espConnectionStatus !== ConnectionStatus.Connected && topic !== 'grill/status') {
             // throw new Error('ESP32 not connected');
            console.warn(`[MQTT] Attempting to publish to "${topic}" while ESP32 status is ${espConnectionStatus}`);
            toast.warning("Se ha enviado una orden a la parrilla pero está apagada.")
        }
        console.log(`[MQTT] Publishing to "${topic}": ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`); 
        await new Promise<void>((resolve, reject) => {
          client.publish(topic, payload, { qos: 1, ...options }, (err?: Error | null) => {
            if (err) {
                 console.error(`[MQTT] Failed to publish to "${topic}":`, err); 
                 return reject(err);
            }
            resolve()
          })
        })
      },
      subscribe: async (topic, handler) => {
        if (!client) throw new Error('MQTT client not initialized')
        
        await new Promise<void>((resolve, reject) => {
          // Check if already subscribed to avoid duplicate subscriptions (library might handle this)
          client.subscribe(topic, { qos: 0 }, (err) => {
             if (err) {
                 console.error(`[MQTT] Failed to subscribe to "${topic}":`, err); // Log subscription errors
                 return reject(err);
             }
             resolve();
          });
        })

        // Store handler under the pattern it was subscribed with
        let set = handlersRef.current.get(topic)
        if (!set) {
          set = new Set()
          handlersRef.current.set(topic, set)
        }
        set.add(handler)

        // Return unsubscribe function
        return () => {
          const s = handlersRef.current.get(topic)
          if (s) {
            s.delete(handler)
            if (s.size === 0) {
                 handlersRef.current.delete(topic)
                 // Also unsubscribe from the broker if no handlers left
                 if (client && client.connected) {
                     client.unsubscribe(topic);
                 }
            }
          }
        }
      },
    }),
    [client, espConnectionStatus, clientConnectionStatus, error]
  )

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>
}

export function useMqtt() {
  const ctx = useContext(MqttContext)
  if (!ctx) throw new Error('useMqtt must be used within MqttProvider')
  return ctx
}
