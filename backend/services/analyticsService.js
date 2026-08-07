// backend/services/analyticsService.js
// Enterprise Admin Analytics Engine — Financial Metrics, Trends & Performance Metrics

import db from '../config/db.js';

export const AnalyticsService = {
  async getAdminAnalytics() {
    try {
      // 1. Total Revenue, Rides & Financial Breakdown
      const [[revRow]] = await db.execute(`
        SELECT
          COALESCE(SUM(CASE WHEN ride_status = 'Completed' OR payment_status = 'paid' THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN (ride_status = 'Completed' OR payment_status = 'paid') AND created_at >= CURDATE() THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END), 0) AS today_revenue,
          COALESCE(SUM(CASE WHEN (ride_status = 'Completed' OR payment_status = 'paid') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END), 0) AS weekly_revenue,
          COALESCE(SUM(CASE WHEN (ride_status = 'Completed' OR payment_status = 'paid') AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END), 0) AS monthly_revenue,
          COALESCE(SUM(CASE WHEN payment_method = 'Wallet' AND (ride_status = 'Completed' OR payment_status = 'paid') THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END), 0) AS wallet_revenue,
          COALESCE(SUM(CASE WHEN ride_status = 'Completed' OR payment_status = 'paid' THEN COALESCE(final_fare, estimated_fare, 0) * 0.15 ELSE 0 END), 0) AS commission_revenue,
          COUNT(CASE WHEN ride_status = 'Completed' THEN 1 END) AS completed_rides,
          COUNT(CASE WHEN ride_status = 'Cancelled' THEN 1 END) AS cancelled_rides
        FROM rides
      `);

      // 2. Tips Revenue
      const [[tipsRow]] = await db.execute(`
        SELECT COALESCE(SUM(amount), 0) AS total_tips FROM ride_tips WHERE payment_status = 'Success' OR payment_status = 'paid'
      `).catch(() => [[{ total_tips: 0 }]]);

      // 3. Active Drivers & Riders
      const [[driverRow]] = await db.execute(`
        SELECT COUNT(*) AS active_drivers FROM driver_profiles WHERE is_online = 1 AND verification_status = 'approved'
      `).catch(() => [[{ active_drivers: 0 }]]);

      const [[riderRow]] = await db.execute(`
        SELECT COUNT(*) AS active_riders FROM profiles WHERE role = 'rider'
      `).catch(() => [[{ active_riders: 0 }]]);

      // 4. Daily Revenue & Ride Trend Graph (Last 7 Days)
      const [trendRows] = await db.execute(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') AS date_label,
          COUNT(*) AS total_rides,
          COUNT(CASE WHEN ride_status = 'Completed' THEN 1 END) AS completed,
          COALESCE(SUM(CASE WHEN ride_status = 'Completed' OR payment_status = 'paid' THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END), 0) AS revenue
        FROM rides
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date_label ASC
      `).catch(() => [[]]);

      // 5. Driver Performance Rankings
      const [driverPerformance] = await db.execute(`
        SELECT
          p.full_name AS driver_name,
          p.phone,
          dp.rating,
          COUNT(r.id) AS total_trips,
          COALESCE(SUM(COALESCE(r.final_fare, r.estimated_fare, 0)), 0) AS gross_earnings
        FROM driver_profiles dp
        JOIN profiles p ON dp.profile_id = p.id
        LEFT JOIN rides r ON dp.id = r.driver_id AND (r.ride_status = 'Completed' OR r.payment_status = 'paid')
        GROUP BY dp.id, p.full_name, p.phone, dp.rating
        ORDER BY gross_earnings DESC
        LIMIT 10
      `).catch(() => [[]]);

      return {
        cards: {
          total_revenue: Number(revRow?.total_revenue || 0),
          today_revenue: Number(revRow?.today_revenue || 0),
          weekly_revenue: Number(revRow?.weekly_revenue || 0),
          monthly_revenue: Number(revRow?.monthly_revenue || 0),
          wallet_revenue: Number(revRow?.wallet_revenue || 0),
          tips_revenue: Number(tipsRow?.total_tips || 0),
          commission_revenue: Number(revRow?.commission_revenue || 0),
          completed_rides: Number(revRow?.completed_rides || 0),
          cancelled_rides: Number(revRow?.cancelled_rides || 0),
          active_drivers: Number(driverRow?.active_drivers || 0),
          active_riders: Number(riderRow?.active_riders || 0)
        },
        revenue_trends: trendRows,
        driver_performance: driverPerformance
      };
    } catch (err) {
      console.error('[AnalyticsService] Error:', err.message);
      throw err;
    }
  }
};

export default AnalyticsService;
