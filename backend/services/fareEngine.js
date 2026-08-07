import db from '../config/db.js';

// Peak hours: 7-10 AM and 5-9 PM
function isCurrentlyPeakHour() {
  const hour = new Date().getHours();
  return (hour >= 7 && hour < 10) || (hour >= 17 && hour < 21);
}

export const FareEngine = {
  async calculateFare(distanceKm, durationMinutes, options = {}) {
    const {
      vehicleType = 'Economy',
      waitingTimeMinutes = 0,
      isNightCharge = false,
      isPeakHour: forcePeakHour = false,
      couponDiscount = 0,
      referralDiscount = 0,
      tripType = 'one_way',
      isAc = false
    } = options;

    let baseFareVal = null;
    let slab015Val = null;
    let slab1540Val = null;
    let slab40PlusVal = null;
    let acSurchargeVal = null;
    let surgePricingEnabled = false;

    try {
      const [settings] = await db.query('SELECT setting_key, setting_value FROM app_settings');
      settings?.forEach(s => {
        if (s.setting_key === 'base_fare') baseFareVal = parseFloat(s.setting_value);
        if (s.setting_key === 'slab_0_15_rate') slab015Val = parseFloat(s.setting_value);
        if (s.setting_key === 'slab_15_40_rate') slab1540Val = parseFloat(s.setting_value);
        if (s.setting_key === 'slab_40_plus_rate') slab40PlusVal = parseFloat(s.setting_value);
        if (s.setting_key === 'ac_surcharge_rate') acSurchargeVal = parseFloat(s.setting_value);
        if (s.setting_key === 'surge_pricing') surgePricingEnabled = s.setting_value === 'true';
      });
    } catch (err) {
      console.warn('[FareEngine] Failed to load app settings from database, using defaults:', err.message);
    }

    const base = baseFareVal !== null && !isNaN(baseFareVal) ? baseFareVal : 40;
    const r0_15 = slab015Val !== null && !isNaN(slab015Val) ? slab015Val : 15;
    const r15_40 = slab1540Val !== null && !isNaN(slab1540Val) ? slab1540Val : 18;
    const r40Plus = slab40PlusVal !== null && !isNaN(slab40PlusVal) ? slab40PlusVal : 22;
    const acRatePerKm = acSurchargeVal !== null && !isNaN(acSurchargeVal) ? acSurchargeVal : 3;

    // Handle round trip (two-way) distance calculation
    const effectiveDistance = tripType === 'two_way' ? distanceKm * 2 : distanceKm;

    // Calculate Slab-based distance fare
    let distanceFare = 0;
    let km0_15 = 0;
    let km15_40 = 0;
    let km40Plus = 0;

    if (effectiveDistance <= 15) {
      km0_15 = effectiveDistance;
      distanceFare = km0_15 * r0_15;
    } else if (effectiveDistance <= 40) {
      km0_15 = 15;
      km15_40 = effectiveDistance - 15;
      distanceFare = (km0_15 * r0_15) + (km15_40 * r15_40);
    } else {
      km0_15 = 15;
      km15_40 = 25;
      km40Plus = effectiveDistance - 40;
      distanceFare = (km0_15 * r0_15) + (km15_40 * r15_40) + (km40Plus * r40Plus);
    }

    // AC Surcharge calculation
    const acSurcharge = isAc ? effectiveDistance * acRatePerKm : 0;

    // 1. Base Fare
    const baseFare = base;

    // 2. Time Fare (₹2/min)
    const timeFare = durationMinutes * 2;

    // 3. Waiting Charge (₹3 per minute)
    const waitingCharge = waitingTimeMinutes * 3.00;

    // 4. Night Charge (+10% surcharge)
    let nightCharge = 0;
    if (isNightCharge) {
      nightCharge = (baseFare + distanceFare + acSurcharge + timeFare) * 0.10;
    }

    // 5. Peak Hour Surge
    const peakHour = forcePeakHour || (surgePricingEnabled && isCurrentlyPeakHour());
    const surgePricing = peakHour ? 1.25 : 1.0;

    // Subtotal
    const subtotal = (baseFare + distanceFare + acSurcharge + timeFare + waitingCharge + nightCharge) * surgePricing;

    // 6. Taxes (5% GST)
    const tax = subtotal * 0.05;

    // Gross Fare
    const grossFare = subtotal + tax;

    // 7. Apply Discounts
    const discount = Math.min(grossFare, parseFloat(couponDiscount || 0) + parseFloat(referralDiscount || 0));
    const finalFare = Math.max(0, Math.round((grossFare - discount) * 100) / 100);

    // REMOVE COMMISSION FEE: Driver receives 100% of final fare
    const commission = 0;
    const driverEarnings = finalFare;

    return {
      baseFare,
      distanceFare: Math.round(distanceFare * 100) / 100,
      acSurcharge: Math.round(acSurcharge * 100) / 100,
      effectiveDistance: Math.round(effectiveDistance * 100) / 100,
      tripType,
      isAc: Boolean(isAc),
      timeFare,
      waitingCharge,
      nightCharge: Math.round(nightCharge * 100) / 100,
      surgeMultiplier: surgePricing,
      isPeakHour: peakHour,
      surgePricingEnabled,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      finalFare,
      commission: 0,
      driverEarnings
    };
  }
};
export default FareEngine;
