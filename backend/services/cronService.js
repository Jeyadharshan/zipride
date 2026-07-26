// backend/services/cronService.js
// Background task schedulers using actual MySQL schema

import db from '../config/db.js';

export const CronService = {
  initializeSchedulers() {

    // 1. Expired OTP Cleanup (Runs every hour)
    setInterval(async () => {
      try {
        console.log('[Scheduler Job] Running Expired OTP Cleanup...');
        if (db.execute) {
          const [result] = await db.execute(
            `DELETE FROM ride_otp WHERE ride_id IN (SELECT id FROM rides WHERE ride_status IN ('Cancelled', 'Ride Completed'))`
          );
          console.log('[Scheduler Job] OTP Cleanup complete. Rows affected:', result.affectedRows || 0);
        }
      } catch (err) {
        console.error('[Scheduler Job] Error in OTP Cleanup:', err.message);
      }
    }, 60 * 60 * 1000);

    // 2. Driver Offline Cleanup (Runs every 10 minutes)
    // Mark drivers offline who have not reported coordinate streams in the last 15 minutes
    setInterval(async () => {
      try {
        console.log('[Scheduler Job] Running Driver Offline Cleanup...');
        if (db.execute) {
          const [result] = await db.execute(
            `UPDATE driver_profiles SET is_online = 0 
             WHERE is_online = 1 AND updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
          );
          console.log('[Scheduler Job] Driver Offline Cleanup complete. Rows affected:', result.affectedRows || 0);
        }
      } catch (err) {
        console.error('[Scheduler Job] Error in Driver Offline Cleanup:', err.message);
      }
    }, 10 * 60 * 1000);

    // 3. Ride Timeout Scheduler (Runs every 2 minutes)
    // Cancel ride requests that remain in 'Searching' status for more than 5 minutes
    setInterval(async () => {
      try {
        console.log('[Scheduler Job] Running Ride Timeout Check...');
        if (db.execute) {
          const [result] = await db.execute(
            `UPDATE rides SET ride_status = 'Cancelled', cancelled_time = NOW(), updated_at = NOW() 
             WHERE ride_status = 'Searching' AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
          );
          console.log('[Scheduler Job] Ride Timeout Check complete. Rows affected:', result.affectedRows || 0);
        }
      } catch (err) {
        console.error('[Scheduler Job] Error in Ride Timeout Check:', err.message);
      }
    }, 2 * 60 * 1000);
  }
};
export default CronService;
