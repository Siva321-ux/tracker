import { initDatabase, dbQuery } from '../src/config/database';
import { generateToken, verifyToken } from '../src/config/jwt';
import bcrypt from 'bcryptjs';

async function runBackendModule1Tests() {
  console.log('=== RUNNING MODULE 1 BACKEND & DATABASE TESTS ===\n');

  try {
    // 1. Initialize Database (SQLite fallback mode for local testing)
    await initDatabase();
    console.log('✓ Database initialized successfully');

    // 2. Test JWT Token Generation & Verification
    const payload = { userId: 1, email: 'test@example.com' };
    const token = generateToken(payload);
    const verified = verifyToken(token);
    if (verified.userId === 1 && verified.email === 'test@example.com') {
      console.log('✓ JWT Token generation and verification PASSED');
    } else {
      throw new Error('JWT verification failed');
    }

    // 3. Test Password Hashing with Bcrypt
    const pass = 'secret123';
    const hash = await bcrypt.hash(pass, 10);
    const match = await bcrypt.compare(pass, hash);
    if (match) {
      console.log('✓ Bcrypt password hashing PASSED');
    } else {
      throw new Error('Bcrypt hash matching failed');
    }

    // 4. Test User Registration Query
    const userRes = await dbQuery(
      'INSERT INTO users (name, email, password_hash, language) VALUES (?, ?, ?, ?)',
      ['Arun Kumar', 'arun@example.com', hash, 'en']
    );
    const userId = userRes[0]?.insertId || userRes[0]?.id;
    console.log(`✓ User inserted into DB with ID: ${userId}`);

    // 5. Test Team Creation Query
    const teamRes = await dbQuery(
      'INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)',
      ['Sathy Field Ops', 'Emergency response team', userId]
    );
    const teamId = teamRes[0]?.insertId || teamRes[0]?.id;
    console.log(`✓ Team inserted with ID: ${teamId}`);

    // 6. Test Devices Registration
    const devices = ['dev1', 'dev2', 'dev3', 'dev4', 'dev5'];
    for (let i = 0; i < devices.length; i++) {
      await dbQuery(
        'INSERT INTO devices (device_code, device_name, team_id, status) VALUES (?, ?, ?, ?)',
        [devices[i], `Device ${devices[i]}`, teamId, 'online']
      );
    }
    const devRows = await dbQuery('SELECT COUNT(*) as count FROM devices WHERE team_id = ?', [teamId]);
    console.log(`✓ Registered ${devRows[0].count} devices for team ${teamId}`);

    // 7. Test Location Insertion
    await dbQuery(
      'INSERT INTO locations (device_id, latitude, longitude, value, source) VALUES (?, ?, ?, ?, ?)',
      [1, 28.6050, 77.3700, 88, 'lora']
    );
    const locRows = await dbQuery('SELECT * FROM locations WHERE device_id = 1');
    if (locRows.length > 0 && locRows[0].latitude === 28.6050) {
      console.log('✓ Location insertion and retrieval PASSED');
    } else {
      throw new Error('Location query failed');
    }

    // 8. Test Messaging Insertion
    await dbQuery(
      'INSERT INTO public_messages (team_id, sender_id, message) VALUES (?, ?, ?)',
      [teamId, userId, 'Reached checkpoint 1']
    );
    const msgRows = await dbQuery('SELECT * FROM public_messages WHERE team_id = ?', [teamId]);
    if (msgRows.length > 0 && msgRows[0].message === 'Reached checkpoint 1') {
      console.log('✓ Public team message insertion PASSED');
    } else {
      throw new Error('Message query failed');
    }

    console.log('\nALL MODULE 1 BACKEND & DATABASE TESTS PASSED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ MODULE 1 TEST FAILED:', err);
    process.exit(1);
  }
}

runBackendModule1Tests();
