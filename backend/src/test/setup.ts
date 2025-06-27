// Test setup for backend

// Mock console.log in tests unless explicitly needed
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Restore console after all tests
afterAll(() => {
  global.console = originalConsole;
});