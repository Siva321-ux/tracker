import { ApiClient } from '../src/services/api/apiClient';
import { SyncManager } from '../src/services/sync/SyncManager';

async function testFrontendBackendConnection() {
  console.log('======================================================');
  console.log('=== TESTING FRONTEND -> LIVE RENDER BACKEND CONNECTION ===');
  console.log('Target Base URL: https://tracker-91ku.onrender.com');
  console.log('======================================================\n');

  const api = ApiClient.getInstance();
  console.log(`ApiClient Base URL configured: "${api.getBaseUrl()}"`);

  // 1. Test Healthcheck Endpoint
  try {
    console.log('\n[1/3] Testing Healthcheck GET /api/health...');
    const health = await api.get('/api/health');
    console.log('  └─ ✅ Health Response:', JSON.stringify(health));
  } catch (err: any) {
    console.error('  └─ ❌ Health check failed:', err.message);
  }

  // 2. Test Registration / Authentication Endpoint
  const testEmail = `test_user_${Date.now()}@loratracker.com`;
  const testPass = 'Password123!';
  let userToken: string | null = null;

  try {
    console.log(`\n[2/3] Testing Registration POST /api/auth/register with email: ${testEmail}...`);
    const regRes = await api.post('/api/auth/register', {
      name: 'Field Test User',
      email: testEmail,
      password: testPass
    });
    console.log('  └─ ✅ Registration Successful! User ID:', regRes.user?.id || regRes.id || 'OK');
    userToken = regRes.token || null;
  } catch (err: any) {
    console.log('  └─ Registration info:', err.message);
    // If registration fails because user exists, attempt login
    try {
      console.log('  └─ Attempting login with existing credentials...');
      const loginRes = await api.post('/api/auth/login', {
        email: testEmail,
        password: testPass
      });
      console.log('  └─ ✅ Login Successful! User ID:', loginRes.user?.id || loginRes.id || 'OK');
      userToken = loginRes.token || null;
    } catch (loginErr: any) {
      console.error('  └─ ❌ Login failed:', loginErr.message);
    }
  }

  // 3. Test Sync Endpoint
  try {
    console.log('\n[3/3] Testing Data Sync POST /api/sync...');
    const syncRes = await api.post('/api/sync', {
      items: [
        {
          id: 999,
          entity_type: 'location',
          entity_id: 1,
          operation: 'INSERT',
          payload: JSON.stringify({ deviceId: 'dev1', latitude: 11.5034, longitude: 77.2444 })
        }
      ]
    }, userToken);
    console.log('  └─ ✅ Sync Endpoint Response:', JSON.stringify(syncRes));
  } catch (err: any) {
    console.error('  └─ ❌ Sync test failed:', err.message);
  }

  console.log('\n======================================================');
  console.log('🎉 FRONTEND -> BACKEND CONNECTION TEST COMPLETE 🎉');
  console.log('======================================================');
}

testFrontendBackendConnection();
