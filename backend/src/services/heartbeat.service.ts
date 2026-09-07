import { CONFIG } from '../config/index.js';
import { getAllDevices, updateDeviceOnlineStatus, logEvent } from '../database/db.js';
import { emitDeviceStatus } from '../websocket/socket.js';

let intervalId: NodeJS.Timeout | null = null;

export function startHeartbeatMonitor() {
  if (intervalId) clearInterval(intervalId);

  intervalId = setInterval(() => {
    try {
      const devices = getAllDevices();
      const now = Date.now();

      for (const dev of devices) {
        if (dev.is_online === 1) {
          const lastSeenTime = new Date(dev.last_seen).getTime();
          const elapsed = now - lastSeenTime;

          if (elapsed > CONFIG.HEARTBEAT_TIMEOUT_MS) {
            console.log(`[Heartbeat Monitor] Device ${dev.device_id} timed out (${Math.round(elapsed / 1000)}s since last communication). Marking OFFLINE.`);
            updateDeviceOnlineStatus(dev.device_id, false);
            emitDeviceStatus({
              device_id: dev.device_id,
              is_online: 0
            });

            logEvent({
              id: `evt_timeout_${Date.now()}`,
              device_id: dev.device_id,
              event_type: 'DEVICE_OFFLINE',
              sensor: 'NETWORK',
              message: `ESP32 connection lost. No heartbeat for ${Math.round(elapsed / 1000)} seconds.`,
              severity: 'HIGH',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (err) {
      console.error('[Heartbeat Monitor] Error during heartbeat scan:', err);
    }
  }, 5000);
}
