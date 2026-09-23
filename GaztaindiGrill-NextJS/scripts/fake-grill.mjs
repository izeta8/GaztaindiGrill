// Fake ESP32 for developing without the grill. Speaks the contract in GrillConstants.h
// against a local broker: `npm run fake-grill`, with NEXT_PUBLIC_DEV_HOST left empty.
import mqtt from 'mqtt'

const URL = process.env.MQTT_URL || 'mqtt://localhost:1883'
const TICK_MS = 100
const POSITION_PER_SECOND = 8
const DEGREES_PER_SECOND = 30
const TEMPERATURE_INTERVAL_MS = 5000

const grills = [0, 1].map((id) => ({
  id,
  hasRotor: id === 0,
  position: 100,
  targetPosition: null,
  direction: 'stop',
  rotation: 0,
  targetRotation: null,
  rotationDirection: 'stop',
  positionAfterRotation: null,
  published: { position: null, rotation: null },
}))
let mode = 'single'

const client = mqtt.connect(URL, {
  clientId: `fake-grill-${Math.random().toString(16).slice(2, 8)}`,
  will: { topic: 'grill/connection', payload: 'offline', retain: true, qos: 1 },
})

const publish = (topic, payload, retain = false) =>
  client.publish(topic, String(payload), { qos: 1, retain })

const reply = (base, requestId, command, error) =>
  publish(`${base}/status/result`, JSON.stringify({ requestId, command, ok: !error, ...(error && { error }) }))

client.on('connect', () => {
  console.log(`[fake-grill] connected to ${URL}`)
  client.subscribe(['grill/+/action/#', 'grill/request_mode_change', 'grill/request_current_mode', 'grill/emergency_stop', 'grill/restart'])

  publish('grill/connection', 'online', true)
  publish('grill/reset_status', 'ready', true)
  publish('grill/current_mode', mode, true)
  publish('grill/time', Math.floor(Date.now() / 1000), true)
  for (const g of grills) {
    publish(`grill/${g.id}/status/program/current`, JSON.stringify({ isRunning: false }), true)
  }
})

client.on('error', (err) => console.error('[fake-grill]', err.message))

client.on('message', (topic, buffer) => {
  let value = buffer.toString()
  let requestId = 'EVERYONE'
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && 'requestId' in parsed) {
      value = parsed.value
      requestId = parsed.requestId
    }
  } catch { /* bare payload */ }

  const match = topic.match(/^grill\/(\d)\/(.+)$/)
  if (!match) return handleSystem(topic.slice('grill/'.length), value, requestId)

  const g = grills[Number(match[1])]
  const command = match[2]
  const base = `grill/${g.id}`
  console.log(`[fake-grill] ${topic} <- ${JSON.stringify(value)}`)

  switch (command) {
    case 'action/movement/vertical':
      g.targetPosition = null
      g.direction = value
      break
    case 'action/movement/set_position':
      g.direction = 'stop'
      g.targetPosition = Math.max(0, Math.min(100, parseInt(value, 10)))
      break
    case 'action/movement/rotation':
      if (!g.hasRotor) return reply(base, requestId, command, 'no_rotor')
      g.targetRotation = null
      g.rotationDirection = value
      break
    case 'action/movement/set_rotation': {
      if (!g.hasRotor) return reply(base, requestId, command, 'no_rotor')
      const degrees = parseInt(value, 10)
      if (!(degrees >= 0 && degrees < 360)) return reply(base, requestId, command, 'rotation_out_of_range')
      g.rotationDirection = 'stop'
      g.targetRotation = degrees
      break
    }
    case 'action/movement/set_pose': {
      // Turns first and moves afterwards, like the guard on the real grill. The safe-height
      // lift is left out: it changes when the rack arrives, not where it ends up.
      if (!g.hasRotor) return reply(base, requestId, command, 'no_rotor')
      if (typeof value?.position !== 'number' || typeof value?.rotation !== 'number') {
        return reply(base, requestId, command, 'invalid_json')
      }
      if (!(value.rotation >= 0 && value.rotation < 360)) {
        return reply(base, requestId, command, 'rotation_out_of_range')
      }
      g.direction = 'stop'
      g.rotationDirection = 'stop'
      g.targetRotation = value.rotation
      g.positionAfterRotation = Math.max(0, Math.min(100, value.position))
      break
    }
    case 'action/movement/reset_rotation':
      if (!g.hasRotor) return reply(base, requestId, command, 'no_rotor')
      g.rotation = 0
      g.targetRotation = null
      break
    case 'action/program/cancel':
    case 'action/program/skip_step':
      publish(`${base}/status/program/current`, JSON.stringify({ isRunning: false }), true)
      return reply(base, requestId, command, 'no_program_running')
    case 'action/request/program_status':
      publish(`${base}/status/program/current`, JSON.stringify({ isRunning: false }), true)
      break
  }
  reply(base, requestId, command)
})

function handleSystem(command, value, requestId) {
  console.log(`[fake-grill] grill/${command} <- ${JSON.stringify(value)}`)
  if (command === 'request_mode_change' && (value === 'single' || value === 'dual')) {
    mode = value
    publish('grill/current_mode', mode, true)
  } else if (command === 'request_current_mode') {
    publish('grill/current_mode', mode)
  } else if (command === 'emergency_stop') {
    for (const g of grills) Object.assign(g, { direction: 'stop', targetPosition: null, rotationDirection: 'stop', targetRotation: null, positionAfterRotation: null })
  }
  reply('grill', requestId, command)
}

setInterval(() => {
  const step = (POSITION_PER_SECOND * TICK_MS) / 1000
  const turn = (DEGREES_PER_SECOND * TICK_MS) / 1000

  for (const g of grills) {
    if (g.targetPosition !== null) {
      const delta = g.targetPosition - g.position
      g.position = Math.abs(delta) <= step ? g.targetPosition : g.position + Math.sign(delta) * step
      if (g.position === g.targetPosition) g.targetPosition = null
    } else if (g.direction === 'up' || g.direction === 'down') {
      g.position = Math.max(0, Math.min(100, g.position + (g.direction === 'up' ? step : -step)))
    }

    if (g.targetRotation !== null) {
      const delta = ((g.targetRotation - g.rotation + 540) % 360) - 180
      g.rotation = Math.abs(delta) <= turn ? g.targetRotation : (g.rotation + Math.sign(delta) * turn + 360) % 360
      if (g.rotation === g.targetRotation) {
        g.targetRotation = null
        if (g.positionAfterRotation !== null) {
          g.targetPosition = g.positionAfterRotation
          g.positionAfterRotation = null
        }
      }
    } else if (g.rotationDirection === 'clockwise' || g.rotationDirection === 'counter_clockwise') {
      g.rotation = (g.rotation + (g.rotationDirection === 'clockwise' ? turn : -turn) + 360) % 360
    }

    const position = Math.round(g.position)
    if (position !== g.published.position) {
      g.published.position = position
      publish(`grill/${g.id}/status/sensor/position`, position, true)
    }

    const rotation = Math.round(g.rotation)
    if (g.hasRotor && rotation !== g.published.rotation) {
      g.published.rotation = rotation
      publish(`grill/${g.id}/status/sensor/rotation`, rotation, true)
    }
  }
}, TICK_MS)

// Only the left grill has a thermocouple. Closer to the embers means hotter.
setInterval(() => {
  const temperature = Math.round(320 - grills[0].position * 2 + (Math.random() * 6 - 3))
  publish('grill/0/status/sensor/temperature', temperature)
}, TEMPERATURE_INTERVAL_MS)

const shutdown = () => {
  publish('grill/connection', 'offline', true)
  client.end(false, () => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
