import express from 'express';
import http from 'http';
import cors from 'cors';
import { CONFIG } from './config/index.js';
import { initDatabase } from './database/db.js';
import { initWebSocket } from './websocket/socket.js';
import { startEmbeddedBroker } from './mqtt/broker.js';
import { initMqttClient } from './mqtt/client.js';
import { startHeartbeatMonitor } from './services/heartbeat.service.js';
import { startInProcessSimulator } from './services/esp32Simulator.service.js';

import { authRouter } from './routes/auth.routes.js';
import { deviceRouter } from './routes/device.routes.js';
import { alertRouter } from './routes/alert.routes.js';
import { healthRouter } from './routes/health.routes.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize SQLite DB
initDatabase();

// Initialize WebSocket Gateway
initWebSocket(server);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/device', deviceRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/health', healthRouter);

// Root greeting
app.get('/', (_req, res) => {
  res.json({
    app: 'SECUREBELONG IoT Backend',
    version: '1.0.0',
    description: 'Personal Belonging & Area Security System IoT Server',
    mqtt_broker: `0.0.0.0:${CONFIG.MQTT_PORT}`,
    rest_api: `http://localhost:${CONFIG.PORT}/api`,
    websocket: `ws://localhost:${CONFIG.PORT}`
  });
});

async function bootstrap() {
  try {
    // 1. Start Embedded MQTT Broker (Port 1883)
    await startEmbeddedBroker();

    // 2. Start MQTT Subscriber Client
    await initMqttClient();

    // 3. Start In-Process Hardware Simulator (Streams live feeds for testing)
    startInProcessSimulator();

    // 4. Start Heartbeat Monitor for hardware disconnection detection
    startHeartbeatMonitor();

    // 4. Start HTTP & WebSocket Server
    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🛡️  SECUREBELONG IoT Server Running on http://localhost:${CONFIG.PORT}`);
      console.log(`📡 Embedded MQTT Broker listening on port ${CONFIG.MQTT_PORT}`);
      console.log(`⚡ WebSocket Stream ready for mobile connections`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Fatal bootstrap error:', error);
    process.exit(1);
  }
}

bootstrap();
