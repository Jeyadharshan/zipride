// backend/tests/ride.test.js
// Ride flow unit tests: fare calculation, OTP generation, matching engine logic

import { describe, it, expect } from '@jest/globals';

describe('Ride Flow - Fare Calculation', () => {
  it('should return all fare breakdown fields', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const result = await FareEngine.calculateFare(10, 20, { vehicleType: 'Sedan' });
    expect(result).toHaveProperty('baseFare');
    expect(result).toHaveProperty('distanceFare');
    expect(result).toHaveProperty('timeFare');
    expect(result).toHaveProperty('tax');
    expect(result).toHaveProperty('finalFare');
    expect(result).toHaveProperty('commission');
    expect(result).toHaveProperty('driverEarnings');
  });

  it('should calculate driver earnings as final fare minus commission', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const result = await FareEngine.calculateFare(10, 20, { vehicleType: 'Economy' });
    expect(result.commission + result.driverEarnings).toBeCloseTo(result.finalFare, 2);
  });

  it('should not produce negative final fare even with large discounts', async () => {
    const { FareEngine } = await import('../services/fareEngine.js');
    const result = await FareEngine.calculateFare(2, 5, { couponDiscount: 9999 });
    expect(result.finalFare).toBeGreaterThanOrEqual(0);
  });
});

describe('Ride Flow - OTP', () => {
  it('should generate unique OTPs on each call', async () => {
    const { generateOtp } = await import('../utils/otp.js');
    const otps = new Set(Array.from({ length: 100 }, () => generateOtp(4)));
    // With 100 OTPs from a pool of 9000, expect at least 80 unique values
    expect(otps.size).toBeGreaterThan(80);
  });
});

describe('Pagination Utilities', () => {
  it('should parse default pagination params', async () => {
    const { parsePagination } = await import('../utils/pagination.js');
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.order).toBe('DESC');
  });

  it('should cap limit at 1000', async () => {
    const { parsePagination } = await import('../utils/pagination.js');
    const result = parsePagination({ limit: '9999' });
    expect(result.limit).toBe(1000);
  });

  it('should extract search and status params', async () => {
    const { parsePagination } = await import('../utils/pagination.js');
    const result = parsePagination({ search: 'john', status: 'active', page: '2', limit: '20' });
    expect(result.search).toBe('john');
    expect(result.status).toBe('active');
    expect(result.page).toBe(2);
    expect(result.offset).toBe(20);
  });
});

describe('Helpers', () => {
  it('should calculate haversine distance between two coordinates', async () => {
    const { getDistanceBetweenCoordinates } = await import('../utils/helpers.js');
    // Chennai Central to Marina Beach (approx 3km)
    const dist = getDistanceBetweenCoordinates(13.0827, 80.2707, 13.0500, 80.2824);
    expect(dist).toBeGreaterThan(2);
    expect(dist).toBeLessThan(5);
  });

  it('should generate unique invoice numbers', async () => {
    const { generateInvoiceNumber } = await import('../utils/helpers.js');
    const inv1 = generateInvoiceNumber();
    const inv2 = generateInvoiceNumber();
    expect(inv1).toMatch(/^ZR-INV-/);
    expect(inv1).not.toBe(inv2);
  });
});
