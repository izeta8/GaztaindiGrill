// Sends a demo program to the fake grill, for when no API is running to list real ones.
// `npm run fake-program` runs it on the left grill, `npm run fake-program -- 1` on the right one.
import mqtt from 'mqtt'

const URL = process.env.MQTT_URL || 'mqtt://localhost:1883'
const grillId = process.argv[2] === '1' ? 1 : 0

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
  const topic = `grill/${grillId}/action/program/execute`
  client.publish(topic, JSON.stringify({ value: program, requestId: 'EVERYONE' }), { qos: 1 }, () => {
    console.log(`[fake-program] sent "${program.name}" to ${topic}`)
    client.end()
  })
})

client.on('error', (err) => {
  console.error('[fake-program]', err.message)
  process.exit(1)
})
