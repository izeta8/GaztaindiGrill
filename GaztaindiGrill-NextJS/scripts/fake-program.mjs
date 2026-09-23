// Sends a demo program to the fake grill, for when no API is running to list real ones.
// `npm run fake-program -- <0|1> [cancel]`: 0 is the left grill (the default), 1 the right one.
import mqtt from 'mqtt'

const URL = process.env.MQTT_URL || 'mqtt://localhost:1883'
const args = process.argv.slice(2)
const grillId = args.includes('1') ? 1 : 0
const cancel = args.includes('cancel')

const steps = [
  { position: 40 },
  { time: 15 },
  { rotation: 90 },
  { time: 10 },
  { rotation: 0 },
  { position: 80 },
].filter((s) => grillId === 0 || s.rotation === undefined)

const program = {
  programId: 0,
  name: 'Programa de prueba',
  description: 'Lanzado con npm run fake-program.',
  creatorName: 'fake-grill',
  usageCount: 0,
  referenceType: 'absolute',
  steps,
}

const client = mqtt.connect(URL)

client.on('connect', () => {
  const topic = `grill/${grillId}/action/program/${cancel ? 'cancel' : 'execute'}`
  const value = cancel ? '' : program
  client.publish(topic, JSON.stringify({ value, requestId: 'EVERYONE' }), { qos: 1 }, () => {
    console.log(`[fake-program] ${cancel ? 'cancel' : `"${program.name}"`} -> ${topic}`)
    client.end()
  })
})

client.on('error', (err) => {
  console.error('[fake-program]', err.message)
  process.exit(1)
})
