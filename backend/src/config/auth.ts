export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: 10,
  cookieName: 'auth-token',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieSameSite: 'lax' as const,
  invitationExpiresIn: '7d',
};