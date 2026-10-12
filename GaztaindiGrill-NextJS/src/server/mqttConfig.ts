import 'server-only'
import type { MqttConfig } from '@/types'

// Read per request, not at build time, so one image runs against any broker.
export const readMqttConfig = (): MqttConfig => ({
  host: process.env.MQTT_HOST || undefined,
  port: process.env.MQTT_PORT || undefined,
  protocol: process.env.MQTT_PROTOCOL || undefined,
  path: process.env.MQTT_PATH || undefined,
  username: process.env.MQTT_USER || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
})
