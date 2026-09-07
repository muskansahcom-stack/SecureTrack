import Aedes from 'aedes';
import net from 'net';
import { CONFIG } from '../config/index.js';
import { updateDeviceOnlineStatus, logEvent } from '../database/db.js';
import { emitDeviceStatus } from '../websocket/socket.js';

export let aedesBroker: any = null;
let netServer: net.Server | null = null;
type MessageHandler = (topic: string, payload: Buffer) => void;
const messageHandlers: MessageHandler[] = [];

export function registerBrokerMessageHandler(handler: MessageHandler) {
  messageHandlers.push(handler);
}

export function startEmbeddedBroker(): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const AedesConstructor: any = Aedes;
      aedesBroker = typeof AedesConstructor === 'function' ? new AedesConstructor() : (AedesConstructor.default ? new AedesConstructor.default() : AedesConstructor());
      netServer = net.createServer(aedesBroker.handle);

      aedesBroker.on('client', (client: any) => {
        console.log(`[MQTT Broker] Client connected: ${client ? client.id : 'unknown'}`);
        if (client && client.id) {
          const deviceId = client.id;
          updateDeviceOnlineStatus(deviceId, true);
          emitDeviceStatus({ device_id: deviceId, is_online: 1 });
          logEvent({
            id: `evt_conn_${Date.now()}`,
            device_id: deviceId,
            event_type: 'DEVICE_ONLINE',
            sensor: 'NETWORK',
            message: `Device ${deviceId} connected via MQTT broker.`,
            severity: 'INFO',
            timestamp: new Date().toISOString()
          });
        }
      });

      aedesBroker.on('clientDisconnect', (client: any) => {
        console.log(`[MQTT Broker] Client disconnected: ${client ? client.id : 'unknown'}`);
        if (client && client.id) {
          const deviceId = client.id;
          updateDeviceOnlineStatus(deviceId, false);
          emitDeviceStatus({ device_id: deviceId, is_online: 0 });
          logEvent({
            id: `evt_disc_${Date.now()}`,
            device_id: deviceId,
            event_type: 'DEVICE_OFFLINE',
            sensor: 'NETWORK',
            message: `Device ${deviceId} disconnected from MQTT broker.`,
            severity: 'HIGH',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Direct in-process publish listener
      aedesBroker.on('publish', (packet: any, client: any) => {
        if (packet && packet.topic && !packet.topic.startsWith('$SYS')) {
          const topic = packet.topic;
          const payload = packet.payload;
          for (const handler of messageHandlers) {
            handler(topic, payload);
          }
        }
      });

      netServer.listen(CONFIG.MQTT_PORT, '0.0.0.0', () => {
        console.log(`[MQTT Broker] Embedded Aedes MQTT broker running on 0.0.0.0:${CONFIG.MQTT_PORT}`);
        resolve(CONFIG.MQTT_PORT);
      });

      netServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[MQTT Broker] Port ${CONFIG.MQTT_PORT} is already in use. Proceeding with in-process event broker.`);
          resolve(CONFIG.MQTT_PORT);
        } else {
          console.error('[MQTT Broker] Error:', err.message);
          resolve(CONFIG.MQTT_PORT);
        }
      });
    } catch (error) {
      console.error('[MQTT Broker] Failed to start:', error);
      resolve(CONFIG.MQTT_PORT);
    }
  });
}

export function publishToBroker(topic: string, payloadStr: string): void {
  if (aedesBroker) {
    aedesBroker.publish(
      {
        topic,
        payload: Buffer.from(payloadStr),
        qos: 1,
        retain: false,
        cmd: 'publish',
        dup: false
      },
      (err: any) => {
        if (err) {
          console.error(`[MQTT Broker] Error publishing packet to ${topic}:`, err);
        } else {
          console.log(`[MQTT Broker] Published in-process to ${topic}:`, payloadStr);
        }
      }
    );
  }
}
