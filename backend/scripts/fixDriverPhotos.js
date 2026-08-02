import db from '../config/db.js';

async function fixDriverPhotos() {
  try {
    console.log('Fixing driver profile photos in database...');
    const [dpRows] = await db.query(
      'SELECT dp.id, dp.profile_id, p.full_name FROM driver_profiles dp JOIN profiles p ON dp.profile_id = p.id'
    );

    for (const driver of dpRows) {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name || 'Driver')}&background=0284c7&color=fff&size=400`;
      
      await db.query(
        'UPDATE driver_profiles SET profile_photo = ? WHERE id = ? AND (profile_photo LIKE "/uploads/%" OR profile_photo IS NULL)',
        [avatarUrl, driver.id]
      );
      await db.query(
        'UPDATE profiles SET profile_image = ? WHERE id = ? AND (profile_image LIKE "/uploads/%" OR profile_image IS NULL)',
        [avatarUrl, driver.profile_id]
      );
      await db.query(
        'UPDATE driver_documents SET profile_photo = ? WHERE driver_id = ? AND (profile_photo LIKE "/uploads/%" OR profile_photo IS NULL)',
        [avatarUrl, driver.id]
      );
    }

    const [updated] = await db.query(
      'SELECT dp.id, p.full_name, dp.profile_photo, dp.driving_licence_image FROM driver_profiles dp JOIN profiles p ON dp.profile_id = p.id'
    );
    console.log('✅ Updated Driver Profile Photos:', updated);
  } catch (err) {
    console.error('Error fixing driver photos:', err);
  } finally {
    process.exit(0);
  }
}

fixDriverPhotos();
