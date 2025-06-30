#!/usr/bin/env node

// Simple test script to verify MCP server functionality
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test environment variables
process.env.TEST_FLOW_API_URL = 'http://localhost:3001';
process.env.TEST_FLOW_AUTH_TOKEN = 'test-token';

console.log('Starting MCP server test...');

const server = spawn('node', [join(__dirname, 'dist', 'index.js')], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

server.stdout.on('data', (data) => {
  console.log('Server output:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Exit after 5 seconds
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 5000);