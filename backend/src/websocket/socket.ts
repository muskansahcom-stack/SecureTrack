import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Telemetry, Alert, Device } from '../types/index.js';

let io: SocketIOServer | null = null;

export function initWebSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Allow client to join a specific device room
    socket.on('join:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
      console.log(`[WebSocket] Client ${socket.id} joined room: device:${deviceId}`);
    });

    socket.on('leave:device', (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
      console.log(`[WebSocket] Client ${socket.id} left room: device:${deviceId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket IO not initialized');
  }
  return io;
}

export function emitTelemetry(telemetry: Telemetry): void {
  if (!io) return;
  io.to(`device:${telemetry.device_id}`).emit('device:telemetry', telemetry);
  io.emit('global:telemetry', telemetry);
}

export function emitAlert(alert: Alert): void {
  if (!io) return;
  io.to(`device:${alert.device_id}`).emit('device:alert', alert);
  io.emit('global:alert', alert);
}

export function emitDeviceStatus(device: Partial<Device> & { device_id: string }): void {
  if (!io) return;
  io.to(`device:${device.device_id}`).emit('device:status', device);
  io.emit('global:device_status', device);
}

export function emitCommandAck(deviceId: string, ack: { command: string; success: boolean; message: string; timestamp: number }): void {
  if (!io) return;
  io.to(`device:${deviceId}`).emit('device:command_ack', ack);
}
