import { Router, Request, Response } from 'express';
import os from 'os';
import { CONFIG } from '../config/index.js';
import { db, getAllDevices } from '../database/db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  let dbStatus = 'HEALTHY';
  try {
    db.prepare('SELECT 1').get();
  } catch (e) {
    dbStatus = 'ERROR';
  }

  const devices = getAllDevices();
  const onlineCount = devices.filter(d => d.is_online === 1).length;

  return res.json({
    status: 'ONLINE',
    system: 'SECUREBELONG IoT Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_sec: Math.floor(process.uptime()),
    mqtt_broker_port: CONFIG.MQTT_PORT,
    database_status: dbStatus,
    active_devices: {
      total: devices.length,
      online: onlineCount,
      offline: devices.length - onlineCount
    },
    system_load: os.loadavg(),
    free_memory_mb: Math.round(os.freemem() / (1024 * 1024))
  });
});
