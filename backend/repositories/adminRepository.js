// backend/repositories/adminRepository.js
// Admin operations — uses actual schema:
// profiles, driver_profiles, rides, wallets, wallet_transactions, admins, complaints, support_tickets

import db from '../config/db.js';

export const AdminRepository = {
  // Dashboard stats — extended 13 stats
  async getDashboardStats() {
    const [[userCount]] = await db.execute(`SELECT COUNT(*) AS total FROM profiles WHERE role = 'rider'`);
    const [[driverApproved]] = await db.execute(`SELECT COUNT(*) AS total FROM driver_profiles WHERE verification_status = 'Approved'`);
    const [[driverOnline]] = await db.execute(`SELECT COUNT(*) AS total FROM driver_profiles WHERE is_online = 1`);
    const [[driverOffline]] = await db.execute(`SELECT COUNT(*) AS total FROM driver_profiles WHERE verification_status = 'Approved' AND is_online = 0`);
    const [[pendingDrivers]] = await db.execute(`SELECT COUNT(*) AS total FROM driver_profiles WHERE verification_status = 'Pending'`);
    const [[rideCount]] = await db.execute(`SELECT COUNT(*) AS total FROM rides`);
    const [[todayRides]] = await db.execute(`SELECT COUNT(*) AS total FROM rides WHERE DATE(booking_time) = CURDATE()`);
    const [[completedToday]] = await db.execute(`SELECT COUNT(*) AS total FROM rides WHERE DATE(completed_time) = CURDATE() AND ride_status = 'Ride Completed'`);
    const [[cancelledToday]] = await db.execute(`SELECT COUNT(*) AS total FROM rides WHERE DATE(cancelled_time) = CURDATE() AND ride_status = 'Cancelled'`);
    const [[activeRides]] = await db.execute(`SELECT COUNT(*) AS total FROM rides WHERE ride_status IN ('Searching','Driver Assigned','Driver Accepted','Driver Arrived','OTP Verified','Ride Started')`);
    const [[pendingPayments]] = await db.execute(`SELECT COUNT(*) AS total FROM rides WHERE payment_status = 'Pending' AND ride_status = 'Ride Completed'`);
    const [[revenue]] = await db.execute(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_status = 'Success'`);
    const [[todayRevenue]] = await db.execute(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_status = 'Success' AND DATE(payment_time) = CURDATE()`);
    const [[walletBalance]] = await db.execute(`SELECT COALESCE(SUM(wallet_balance), 0) AS total FROM wallets`);
    const [[avgRating]] = await db.execute(`SELECT COALESCE(AVG(rating), 0) AS avg FROM driver_profiles WHERE verification_status = 'Approved'`);

    // Top 5 drivers by completed rides
    const [topDrivers] = await db.execute(
      `SELECT p.full_name, dp.total_earnings, dp.completed_rides, dp.rating
       FROM driver_profiles dp
       JOIN profiles p ON dp.profile_id = p.id
       WHERE dp.verification_status = 'Approved'
       ORDER BY dp.completed_rides DESC LIMIT 5`
    );

    // Top 5 riders by ride count
    const [topRiders] = await db.execute(
      `SELECT p.full_name, COUNT(r.id) AS ride_count
       FROM rides r
       JOIN profiles p ON r.rider_id = p.id
       GROUP BY r.rider_id, p.full_name
       ORDER BY ride_count DESC LIMIT 5`
    );

    // Active riders (made a ride in last 30 days)
    const [[activeRiders]] = await db.execute(
      `SELECT COUNT(DISTINCT rider_id) AS total FROM rides WHERE booking_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    return {
      totalRiders: userCount.total,
      totalDrivers: driverApproved.total,
      driversOnline: driverOnline.total,
      driversOffline: driverOffline.total,
      pendingDriverApprovals: pendingDrivers.total,
      totalRides: rideCount.total,
      todayRides: todayRides.total,
      completedToday: completedToday.total,
      cancelledToday: cancelledToday.total,
      activeRides: activeRides.total,
      pendingPayments: pendingPayments.total,
      totalRevenue: revenue.total,
      todayRevenue: todayRevenue.total,
      platformWalletBalance: walletBalance.total,
      averageDriverRating: parseFloat(avgRating.avg || 0).toFixed(2),
      activeRiders: activeRiders.total,
      topDrivers,
      topRiders,
    };
  },

  // List all users (riders and drivers)
  async listAllProfiles({ limit = 10, offset = 0, search = '', role = null, status = null } = {}) {
    let sql = `SELECT p.id, p.username, p.full_name, p.phone, p.email, p.role, p.account_status, p.created_at,
                      COUNT(DISTINCT r.id) AS total_rides,
                      COALESCE(SUM(CASE WHEN r.ride_status IN ('Ride Completed', 'completed') THEN COALESCE(r.final_fare, r.estimated_fare, 0) ELSE 0 END), 0) AS total_spent
               FROM profiles p
               LEFT JOIN rides r ON p.id = r.rider_id
               WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (p.full_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (role) { sql += ` AND p.role = ?`; params.push(role); }
    if (status) { sql += ` AND p.account_status = ?`; params.push(status); }
    sql += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async countProfiles(search = '', role = null, status = null) {
    let sql = `SELECT COUNT(*) AS total FROM profiles WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (role) { sql += ` AND role = ?`; params.push(role); }
    if (status) { sql += ` AND account_status = ?`; params.push(status); }
    const [[row]] = await db.execute(sql, params);
    return row.total;
  },

  // List pending drivers with full detail including documents
  async listPendingDrivers({ limit = 10, offset = 0 } = {}) {
    const [rows] = await db.query(
      `SELECT p.id, p.full_name, p.email, p.phone,
              dp.id AS driver_id, dp.driver_code, dp.license_number, dp.verification_status, dp.created_at,
              dd.profile_photo AS profile_photo_url, dd.license_photo AS license_image_url
       FROM driver_profiles dp
       JOIN profiles p ON dp.profile_id = p.id
       LEFT JOIN driver_documents dd ON dd.driver_id = dp.id
       WHERE dp.verification_status = 'Pending'
       ORDER BY dp.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  },

  async setAccountStatus(profileId, status) {
    await db.execute(
      `UPDATE profiles SET account_status = ?, updated_at = NOW() WHERE id = ?`,
      [status, profileId]
    );
  },

  // List rides with full details + search/filter support
  async listRides({ limit = 50, offset = 0, search = '', status = null, dateFilter = null, startDate = null, endDate = null } = {}) {
    let sql = `SELECT r.id, r.ride_code, r.ride_status, r.final_fare, r.estimated_fare, r.payment_method,
                      r.payment_status, r.booking_time, r.completed_time, r.cancelled_time, r.cancellation_reason,
                      r.ride_type, r.actual_distance, r.estimated_distance,
                      rl.pickup_address, rl.drop_address AS dropoff_address,
                      rp.full_name AS rider_name, rp.phone AS rider_phone,
                      dp_p.full_name AS driver_name, dp_p.phone AS driver_phone
               FROM rides r
               LEFT JOIN profiles rp ON r.rider_id = rp.id
               LEFT JOIN driver_profiles dp ON r.driver_id = dp.id
               LEFT JOIN profiles dp_p ON dp.profile_id = dp_p.id
               LEFT JOIN ride_locations rl ON r.id = rl.ride_id
               WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (r.ride_code LIKE ? OR rp.full_name LIKE ? OR dp_p.full_name LIKE ? OR rp.phone LIKE ? OR dp_p.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { sql += ` AND r.ride_status = ?`; params.push(status); }
    if (dateFilter === 'today') { sql += ` AND DATE(r.booking_time) = CURDATE()`; }
    else if (dateFilter === 'week') { sql += ` AND r.booking_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`; }
    else if (dateFilter === 'month') { sql += ` AND r.booking_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`; }
    if (startDate) { sql += ` AND DATE(r.booking_time) >= ?`; params.push(startDate); }
    if (endDate) { sql += ` AND DATE(r.booking_time) <= ?`; params.push(endDate); }

    sql += ` ORDER BY r.booking_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const [rows] = await db.query(sql, params);
    return rows;
  },

  // Report data aggregation for admin reports endpoint
  async getReportData({ reportType = 'revenue', startDate = null, endDate = null } = {}) {
    const dateParts = [];
    if (startDate) dateParts.push(`DATE(r.booking_time) >= '${startDate}'`);
    if (endDate) dateParts.push(`DATE(r.booking_time) <= '${endDate}'`);

    // Dynamic date range defaults if no dates specified
    if (!startDate && !endDate) {
      if (reportType === 'daily') {
        dateParts.push(`DATE(r.booking_time) = CURDATE()`);
      } else if (reportType === 'weekly') {
        dateParts.push(`r.booking_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
      } else if (reportType === 'monthly') {
        dateParts.push(`r.booking_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
      } else if (reportType === 'yearly') {
        dateParts.push(`r.booking_time >= DATE_SUB(NOW(), INTERVAL 365 DAY)`);
      }
    }

    const dateWhere = dateParts.length > 0 ? `AND ${dateParts.join(' AND ')}` : '';

    // Status filter depending on report type
    let statusFilter = '';
    if (reportType === 'cancellation') {
      statusFilter = `AND r.ride_status = 'Cancelled'`;
    } else if (reportType === 'payment') {
      statusFilter = `AND r.payment_status IS NOT NULL`;
    } else if (reportType === 'revenue' || reportType === 'admin_commission') {
      statusFilter = `AND r.ride_status = 'Ride Completed'`;
    }

    // Summary stats
    const [[summary]] = await db.execute(
      `SELECT COUNT(*) AS total_rides,
              SUM(CASE WHEN r.ride_status = 'Ride Completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN r.ride_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
              SUM(CASE WHEN r.ride_status NOT IN ('Ride Completed','Cancelled') THEN 1 ELSE 0 END) AS pending,
              COALESCE(SUM(CASE WHEN r.ride_status = 'Ride Completed' THEN COALESCE(r.final_fare, r.estimated_fare, 0) ELSE 0 END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN r.ride_status = 'Ride Completed' THEN COALESCE(r.final_fare, r.estimated_fare, 0) * 0.10 ELSE 0 END), 0) AS admin_commission,
              COALESCE(SUM(CASE WHEN r.ride_status = 'Ride Completed' THEN COALESCE(r.final_fare, r.estimated_fare, 0) * 0.90 ELSE 0 END), 0) AS driver_earnings
       FROM rides r WHERE 1=1 ${dateWhere}`
    );

    // Wallet stats
    const [[walletStats]] = await db.execute(
      `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'Credit' THEN amount ELSE 0 END), 0) AS total_credits,
              COALESCE(SUM(CASE WHEN transaction_type = 'Debit' THEN amount ELSE 0 END), 0) AS total_debits
       FROM wallet_transactions`
    );

    // Ride details
    const [rides] = await db.execute(
      `SELECT r.id, r.ride_code, r.ride_status, r.final_fare, r.estimated_fare, r.payment_method,
              r.payment_status, r.booking_time, r.completed_time, r.cancellation_reason,
              r.ride_type, r.actual_distance,
              rl.pickup_address, rl.drop_address AS dropoff_address,
              rp.full_name AS rider_name, rp.phone AS rider_phone,
              dp_p.full_name AS driver_name
       FROM rides r
       LEFT JOIN profiles rp ON r.rider_id = rp.id
       LEFT JOIN driver_profiles dp ON r.driver_id = dp.id
       LEFT JOIN profiles dp_p ON dp.profile_id = dp_p.id
       LEFT JOIN ride_locations rl ON r.id = rl.ride_id
       WHERE 1=1 ${dateWhere} ${statusFilter}
       ORDER BY r.booking_time DESC
       LIMIT 1000`
    );

    // Driver earnings breakdown
    const [driverEarnings] = await db.execute(
      `SELECT dp_p.full_name AS driver_name, dp_p.phone AS driver_phone, dp.online_seconds AS online_seconds,
              COUNT(r.id) AS total_rides,
              COALESCE(SUM(COALESCE(r.final_fare, r.estimated_fare, 0)), 0) AS gross_earnings,
              COALESCE(SUM(COALESCE(r.final_fare, r.estimated_fare, 0) * 0.90), 0) AS net_earnings
       FROM rides r
       LEFT JOIN driver_profiles dp ON r.driver_id = dp.id
       LEFT JOIN profiles dp_p ON dp.profile_id = dp_p.id
       WHERE r.ride_status = 'Ride Completed' ${dateWhere}
       GROUP BY r.driver_id, dp_p.full_name, dp_p.phone, dp.online_seconds
       ORDER BY net_earnings DESC
       LIMIT 100`
    );

    return { summary, walletStats, rides, driverEarnings };
  },

  async getAppSettings() {
    const [rows] = await db.execute(`SELECT * FROM app_settings`);
    return rows;
  },

  async updateAppSetting(key, value) {
    await db.execute(
      `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [key, value, value]
    );
  },
};

export default AdminRepository;
