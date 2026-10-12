// Broker settings the server reads from its environment and hands to the browser.
export interface MqttConfig {
  host?: string;
  port?: string;
  protocol?: string;
  path?: string;
  username?: string;
  password?: string;
}
