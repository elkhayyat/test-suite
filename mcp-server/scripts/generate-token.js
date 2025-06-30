#!/usr/bin/env node

/**
 * Generate a secure token for MCP authentication
 */

import crypto from 'crypto';

// Generate a secure random token
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate tokens
const mcpToken = generateToken(32);
const apiToken = generateToken(32);

console.log('🔐 Generated Secure Tokens:\n');
console.log('MCP_AUTH_TOKEN=' + mcpToken);
console.log('TEST_FLOW_AUTH_TOKEN=' + apiToken);
console.log('\n📋 Instructions:');
console.log('1. Copy these tokens to your .env file or cloud secrets');
console.log('2. Use MCP_AUTH_TOKEN in your Claude Desktop configuration');
console.log('3. Use TEST_FLOW_AUTH_TOKEN for Test Flow API authentication');
console.log('\n⚠️  Keep these tokens secret and never commit them to version control!');