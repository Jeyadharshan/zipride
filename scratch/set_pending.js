import db from '../backend/config/db.js';

async function run() {
  try {
    const [result] = await db.query("UPDATE driver_profiles SET verification_status = 'Pending' WHERE id = 19");
    console.log("Success! Updated rows:", result.affectedRows);
    
    // Check if the query for getDriverVerifications returns it
    const [rows] = await db.query(
      `SELECT p.id AS profile_id, p.full_name, dp.id AS driver_id, dp.verification_status
       FROM driver_profiles dp
       JOIN profiles p ON dp.profile_id = p.id
       WHERE dp.id = 19`
    );
    console.log("Driver 19 status in db:", rows);
  } catch (err) {
    console.error("Failed to update status:", err);
  } finally {
    process.exit(0);
  }
}

run();
