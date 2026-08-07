// backend/tests/auth.test.js
// Authentication unit and integration tests
// Run: node --experimental-vm-modules node_modules/.bin/jest tests/auth.test.js

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// ── Mock DB and dependencies ───────────────────────────────────────────────
const mockUser = {
  id: 'test-user-id-001',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'rider',
  phone: '+919000000001',
  password_hash: '$2a$10$exampleHashHere',
  username: 'testuser',
  account_status: 'active',
};

// ── Token generation tests ─────────────────────────────────────────────────
describe('JWT Token Generation', () => {
  it('should generate a valid access token string', async () => {
    const { generateAccessToken } = await import('../config/jwt.js');
    const token = generateAccessToken({ id: 'user-id', role: 'rider' });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('should generate a refresh token that differs from access token', async () => {
    const { generateAccessToken, generateRefreshToken } = await import('../config/jwt.js');
    const access = generateAccessToken({ id: 'user-id', role: 'rider' });
    const refresh = generateRefreshToken({ id: 'user-id', role: 'rider' });
    expect(access).not.toBe(refresh);
  });

  it('should verify a valid access token', async () => {
    const { generateAccessToken, verifyAccessToken } = await import('../config/jwt.js');
    const token = generateAccessToken({ id: 'user-id', role: 'driver' });
    const decoded = verifyAccessToken(token);
    expect(decoded).toBeTruthy();
    expect(decoded.id).toBe('user-id');
    expect(decoded.role).toBe('driver');
  });

  it('should return null for an invalid token', async () => {
    const { verifyAccessToken } = await import('../config/jwt.js');
    const decoded = verifyAccessToken('invalid.token.here');
    expect(decoded).toBeNull();
  });
});

// ── OTP generation tests ───────────────────────────────────────────────────
describe('OTP Utilities', () => {
  it('should generate a 4-digit OTP', async () => {
    const { generateOtp } = await import('../utils/otp.js');
    const otp = generateOtp(4);
    expect(otp).toHaveLength(4);
    expect(Number.isInteger(parseInt(otp))).toBe(true);
  });

  it('should verify matching OTP codes', async () => {
    const { generateOtp, verifyOtpCode } = await import('../utils/otp.js');
    const otp = generateOtp(4);
    expect(verifyOtpCode(otp, otp)).toBe(true);
  });

  it('should reject mismatched OTP codes', async () => {
    const { verifyOtpCode } = await import('../utils/otp.js');
    expect(verifyOtpCode('1234', '5678')).toBe(false);
  });
});

// ── Error codes tests ──────────────────────────────────────────────────────
describe('Error Codes', () => {
  it('should export all required error codes', async () => {
    const { ErrorCodes } = await import('../constants/errorCodes.js');
    expect(ErrorCodes.AUTH_INVALID_TOKEN).toBeDefined();
    expect(ErrorCodes.AUTH_LOGIN_FAILED).toBeDefined();
    expect(ErrorCodes.RIDE_NOT_FOUND).toBeDefined();
    expect(ErrorCodes.WALLET_LOW_BALANCE).toBeDefined();
    expect(ErrorCodes.PAYMENT_FAILED).toBeDefined();
  });
});

// ── Fare engine tests ──────────────────────────────────────────────────────
describe('Fare Engine', () => {
  it('should calculate base fare correctly', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const result = await FareEngine.calculateFare(5, 15, { vehicleType: 'Economy' });
    expect(result.finalFare).toBeGreaterThan(0);
    expect(result.baseFare).toBeGreaterThan(0);
    expect(result.distanceFare).toBeGreaterThan(0);
  });

  it('should apply night charge surcharge', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const normal = await FareEngine.calculateFare(5, 15, { vehicleType: 'Economy' });
    const night = await FareEngine.calculateFare(5, 15, { vehicleType: 'Economy', isNightCharge: true });
    expect(night.finalFare).toBeGreaterThan(normal.finalFare);
  });

  it('should apply surge multiplier for peak hours', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const normal = await FareEngine.calculateFare(5, 15, {});
    const peak = await FareEngine.calculateFare(5, 15, { isPeakHour: true });
    expect(peak.finalFare).toBeGreaterThan(normal.finalFare);
    expect(peak.surgeMultiplier).toBe(1.25);
  });

  it('should apply coupon discounts', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const result = await FareEngine.calculateFare(5, 15, { couponDiscount: 20 });
    expect(result.discount).toBe(20);
  });
});

// ── Response helpers tests ─────────────────────────────────────────────────
describe('Response Utilities', () => {
  it('should have sendSuccess, sendError, sendPaginated exports', async () => {
    const mod = await import('../utils/response.js');
    expect(typeof mod.sendSuccess).toBe('function');
    expect(typeof mod.sendError).toBe('function');
    expect(typeof mod.sendPaginated).toBe('function');
  });
});
