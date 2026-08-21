"use client"

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import mqtt, { IClientOptions, MqttClient, IClientPublishOptions } from 'mqtt'
import { ConnectionStatus, ResetStatus } from '@/types'
import { toast } from 'sonner'
import { TOPICS, REQUEST_ID_EVERYONE } from '@/constants/mqtt'
import { commandErrorMessage } from '@/constants/commandErrors'

type MqttContextValue = {
  client: MqttClient | null
  espConnectionStatus: ConnectionStatus
  clientConnectionStatus: ConnectionStatus
  resetStatus: ResetStatus
  error: string | null
  isPublishing: boolean
  publish: (topic: string, payload: string, options?: IClientPublishOptions) => Promise<void>
  sendCommand: (topic: string, value: unknown, options?: SendCommandOptions) => Promise<void>
  subscribe: (topic: string, handler: (topic: string, payload: Uint8Array) => void) => Promise<() => void>
}

export type SendCommandOptions = {
  // Mutes the toast for this command's answer. Only ever mutes success: a failure the user
  // caused should always surface, so silent commands still report their errors.
  silent?: boolean
}

type PendingCommand = {
  command: string
  silent: boolean
  createdAt: number
}

// crypto.randomUUID() only exists in secure contexts, and this app is served over plain HTTP
// on the LAN, so it is undefined in exactly the deployment that matters. Fall back to a
// random string: these ids only need to be unique among a handful of in-flight commands.
function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// An answer that never arrives (grill rebooted mid-command) would otherwise leak an entry
// per command for the lifetime of the page.
const PENDING_COMMAND_TTL_MS = 30_000

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
  const [resetStatus, setResetStatus] = useState(ResetStatus.Ready)
  const [error, setError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const handlersRef = useRef(new Map<string, Set<(topic: string, payload: Uint8Array) => void>>())
  const pendingCommandsRef = useRef(new Map<string, PendingCommand>())

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

        handlersRef.current.forEach((handlersSet, registeredTopic) => {
          const pattern = new RegExp('^' + registeredTopic.replace(/\+/g, '[^/]+').replace(/#/g, '.+') + '$');
          
          if (pattern.test(topic)) {
            handlersSet.forEach((fn) => {
              try {
                fn(topic, payload)
              } catch (handlerError) {
                console.error(`[MQTT] Error executing handler for topic ${topic}:`, handlerError)
              }
            })
          }
        })
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
      toast.warning(`Se ha enviado una orden a la parrilla pero está apagada: ${topic}`)
    }

    console.log(`[MQTT] Publishing to "${topic}": ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`)
    
    // Visual feedback trigger
    setIsPublishing(true)
    setTimeout(() => setIsPublishing(false), 150)

    await new Promise<void>((resolve, reject) => {
      client.publish(topic, payload, { qos: 1, ...options }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }, [client])

  // Wraps every command in the envelope the firmware expects: { value, requestId }. 
  // The id is recorded here and matched against the answer that comes back on status/result.
  const sendCommand = useCallback(async (topic: string, value: unknown, options?: SendCommandOptions) => {
    const requestId = newRequestId()

    const now = Date.now()
    pendingCommandsRef.current.forEach((entry, id) => {
      if (now - entry.createdAt > PENDING_COMMAND_TTL_MS) pendingCommandsRef.current.delete(id)
    })

    pendingCommandsRef.current.set(requestId, {
      command: topic,
      silent: options?.silent ?? false,
      createdAt: now,
    })

    try {
      await publish(topic, JSON.stringify({ value, requestId }), { qos: 1 })
    } catch (err) {
      pendingCommandsRef.current.delete(requestId)
      throw err
    }
  }, [publish])

  const subscribe = useCallback(async (topic: string, handler: (topic: string, payload: Uint8Array) => void) => {
    if (!client) throw new Error('MQTT client not initialized')

    // 1. Register handler locally FIRST to catch retained messages
    let set = handlersRef.current.get(topic)
    if (!set) {
      set = new Set()
      handlersRef.current.set(topic, set)
    }
    set.add(handler)

    // 2. Then subscribe to the broker
    try {
      await new Promise<void>((resolve, reject) => {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    } catch (err) {
      // Rollback local registration if broker subscription fails
      const s = handlersRef.current.get(topic)
      if (s) {
        s.delete(handler)
        if (s.size === 0) handlersRef.current.delete(topic)
      }
      throw err
    }

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

  // ONE subscription for every command answer, here rather than one per request: a
  // subscribe/unsubscribe round trip per command would race with the reply.
  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online) return

    let isMounted = true

    const handleResult = (_topic: string, payload: Uint8Array) => {
      try {
        const { requestId, ok, error: errorCode } = JSON.parse(payload.toString())

        const pending = pendingCommandsRef.current.get(requestId)
        if (pending) pendingCommandsRef.current.delete(requestId)

        // Somebody else's command: staying quiet is the point of correlating at all, since a
        // toast that matches no action the user took is just confusing.
        if (!pending && requestId !== REQUEST_ID_EVERYONE) return

        if (!ok) {
          toast.error(commandErrorMessage(errorCode))
          return
        }

        // Successes are silent by default today; the flag is what a caller opts into when it
        // does start showing them.
        if (pending?.silent) return
      } catch (err) {
        console.error('[MQTT] Could not parse a command result:', err)
      }
    }

    // Two patterns, because the firmware answers on two different shapes: per-grill commands
    // reply under grill/{id}/..., while system-level ones (mode change, restart) come from a
    // GrillMQTT built with index -1 and so reply under grill/... with no id. A single "+"
    // wildcard matches exactly one level, so it would miss the second.
    const unsubscribers: Array<() => void> = []

    Promise.all([
      subscribe(`grill/+/${TOPICS.STATUS.RESULT}`, handleResult),
      subscribe(`grill/${TOPICS.STATUS.RESULT}`, handleResult),
    ])
      .then((fns) => {
        if (isMounted) unsubscribers.push(...fns)
        else fns.forEach((fn) => fn())
      })
      .catch((err) => console.error('[MQTT] Could not subscribe to command results:', err))

    return () => {
      isMounted = false
      unsubscribers.forEach((fn) => fn())
    }
  }, [clientConnectionStatus, subscribe])

  const value = useMemo(() => ({
    client,
    espConnectionStatus,
    clientConnectionStatus,
    resetStatus,
    error,
    isPublishing,
    publish,
    sendCommand,
    subscribe
  }), [client, espConnectionStatus, clientConnectionStatus, resetStatus, error, isPublishing, publish, sendCommand, subscribe])

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>
}

export function useMqtt() {
  const ctx = useContext(MqttContext)
  if (!ctx) throw new Error('useMqtt must be used within MqttProvider')
  return ctx
}