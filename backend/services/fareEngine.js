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
      referralDiscount = 0
    } = options;

    let baseFareVal = null;
    let perKmRateVal = null;
    let commissionVal = null;
    let surgePricingEnabled = false;

    try {
      const [settings] = await db.query('SELECT setting_key, setting_value FROM app_settings');
      settings.forEach(s => {
        if (s.setting_key === 'base_fare') baseFareVal = parseFloat(s.setting_value);
        if (s.setting_key === 'per_km_rate') perKmRateVal = parseFloat(s.setting_value);
        if (s.setting_key === 'commission') commissionVal = parseFloat(s.setting_value);
        if (s.setting_key === 'surge_pricing') surgePricingEnabled = s.setting_value === 'true';
      });
    } catch (err) {
      console.warn('[FareEngine] Failed to load app settings from database, using defaults:', err.message);
    }

    const base = baseFareVal !== null && !isNaN(baseFareVal) ? baseFareVal : 40;
    const perKm = perKmRateVal !== null && !isNaN(perKmRateVal) ? perKmRateVal : 12;
    const comm = commissionVal !== null && !isNaN(commissionVal) ? commissionVal : 15;

    // Scale rates by vehicle class relative to configured Economy values
    const rates = {
      Economy: { base: base, perKm: perKm, perMin: 2, commission: comm },
      Sedan: { base: Math.round(base * 1.5), perKm: Math.round(perKm * 1.25 * 100) / 100, perMin: 3, commission: comm },
      SUV: { base: base * 2, perKm: Math.round(perKm * 1.67 * 100) / 100, perMin: 4, commission: comm },
      Taxi: { base: base, perKm: perKm, perMin: 2, commission: comm }
    };

    const typeKey = Object.keys(rates).find(k => k.toLowerCase() === vehicleType.toLowerCase()) || 'Economy';
    const rate = rates[typeKey];

    // 1. Base Fare
    const baseFare = rate.base;

    // 2. Distance Fare
    const distanceFare = distanceKm * rate.perKm;

    // 3. Time Fare
    const timeFare = durationMinutes * rate.perMin;

    // 4. Waiting Charge (Rs 3 per minute waiting)
    const waitingCharge = waitingTimeMinutes * 3.00;

    // 5. Night Charge (+10% surcharge)
    let nightCharge = 0;
    if (isNightCharge) {
      nightCharge = (baseFare + distanceFare + timeFare) * 0.10;
    }

    // 6. Peak Hour Surge (1.25x multiplier)
    // Surge applies when:
    //   (a) forcePeakHour flag is explicitly passed, OR
    //   (b) surge_pricing is enabled in admin settings AND current time is a peak hour
    const peakHour = forcePeakHour || (surgePricingEnabled && isCurrentlyPeakHour());
    let surgePricing = 1.0;
    if (peakHour) {
      surgePricing = 1.25;
    }

    // Subtotal
    const subtotal = (baseFare + distanceFare + timeFare + waitingCharge + nightCharge) * surgePricing;

    // 7. Taxes (5% GST)
    const tax = subtotal * 0.05;

    // Gross Fare
    let grossFare = subtotal + tax;

    // 8. Apply Discounts
    const discount = Math.min(grossFare, parseFloat(couponDiscount) + parseFloat(referralDiscount));
    const finalFare = Math.max(0, Math.round((grossFare - discount) * 100) / 100);

    // Platform Commission
    const commission = Math.round(finalFare * (rate.commission / 100) * 100) / 100;
    const driverEarnings = Math.round((finalFare - commission) * 100) / 100;

    return {
      baseFare,
      distanceFare,
      timeFare,
      waitingCharge,
      nightCharge,
      surgeMultiplier: surgePricing,
      isPeakHour: peakHour,
      surgePricingEnabled,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      finalFare,
      commission,
      driverEarnings
    };
  }
};
export default FareEngine;
