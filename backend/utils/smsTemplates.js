// backend/utils/smsTemplates.js
// Reusable SMS message templates for all transactional SMS messages

export const SmsTemplates = {
  otp: (code) =>
    `[ZipRide] Your OTP is ${code}. Valid for 5 minutes. Do NOT share this with anyone.`,

  rideOtp: (code, driverName) =>
    `[ZipRide] Your ride OTP is ${code}. Share this with driver ${driverName} to start your trip.`,

  driverAssigned: (driverName, vehicleModel, plate, eta) =>
    `[ZipRide] Driver ${driverName} (${vehicleModel} - ${plate}) is on the way. ETA: ${eta} min.`,

  rideCompleted: (fare, rideId) =>
    `[ZipRide] Your ride #${rideId.substring(0, 8)} is complete. Fare: Rs.${fare}. Thank you for riding with us!`,

  walletCredit: (amount, balance) =>
    `[ZipRide] Rs.${amount} credited to your ZipRide wallet. Available balance: Rs.${balance}.`,

  walletDebit: (amount, balance) =>
    `[ZipRide] Rs.${amount} debited from your ZipRide wallet. Available balance: Rs.${balance}.`,

  rideCancelled: (rideId) =>
    `[ZipRide] Your ride #${rideId.substring(0, 8)} has been cancelled. Book again anytime.`,

  driverApproved: (name) =>
    `[ZipRide] Congratulations ${name}! Your driver account is approved. You can now go online and accept rides.`,
};

export default SmsTemplates;
