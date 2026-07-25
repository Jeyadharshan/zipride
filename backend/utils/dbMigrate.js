import db from '../config/db.js';

export async function runDatabaseMigrations() {
  try {
    console.log('[Migration] Checking driver_profiles database schema...');
    const columnsToAdd = [
      { name: 'verification_date', type: 'DATETIME DEFAULT NULL' },
      { name: 'verified_by', type: 'CHAR(36) DEFAULT NULL' },
      { name: 'rejection_reason', type: 'TEXT DEFAULT NULL' },
      { name: 'profile_photo', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'driving_licence_image', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'driving_licence_number', type: 'VARCHAR(100) DEFAULT NULL' }
    ];

    const [columns] = await db.query(`SHOW COLUMNS FROM driver_profiles`);
    const existingColNames = new Set(columns.map(c => c.Field));

    for (const col of columnsToAdd) {
      if (!existingColNames.has(col.name)) {
        console.log(`[Migration] Adding missing column "${col.name}" to driver_profiles...`);
        await db.query(`ALTER TABLE driver_profiles ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // Ensure verification_status is VARCHAR(50) so all status values (Verified, Approved, Rejected, Pending) work without truncation
    console.log('[Migration] Ensuring driver_profiles.verification_status is VARCHAR(50)...');
    await db.query(`ALTER TABLE driver_profiles MODIFY COLUMN verification_status VARCHAR(50) NOT NULL DEFAULT 'Pending'`).catch(err => {
      console.warn('[Migration] Note on verification_status column modify:', err.message);
    });

    console.log('✅ [Migration] Database schema check completed successfully.');
  } catch (err) {
    console.warn('⚠️ [Migration] Database migration check skipped or failed:', err.message);
  }
}

export default runDatabaseMigrations;
