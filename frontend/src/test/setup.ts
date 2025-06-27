import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebSocket for testing
global.WebSocket = class WebSocket {
  constructor(_url: string) {
    // Mock implementation
  }
  
  addEventListener() {}
  removeEventListener() {}
  close() {}
  send() {}
} as any;

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false
  }))
}));