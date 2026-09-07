import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'securebelong_jwt_secret_key_2026_super_secure',
  MQTT_PORT: parseInt(process.env.MQTT_PORT || '1883', 10),
  EXTERNAL_MQTT_URL: process.env.EXTERNAL_MQTT_URL || '',
  DB_PATH: path.resolve(process.cwd(), process.env.DB_PATH || './data/securebelong.sqlite'),
  HEARTBEAT_TIMEOUT_MS: parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS || '15', 10) * 1000,
};
