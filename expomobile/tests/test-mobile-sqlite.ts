import { initMobileDatabase } from '../src/database/sqlite';
import {
  saveLocationLocally,
  getLatestDeviceLocationsLocally,
  queueOfflineItem,
  getPendingSyncQueue,
  markSyncItemCompleted,
  savePublicMessageLocally,
  savePrivateMessageLocally,
  addLocalOfflineRegion,
  getLocalOfflineRegions
} from '../src/database/dbQueries';

async function runMobileSqliteTests() {
  console.log('=== RUNNING MODULE 3 MOBILE SQLITE LOCAL STORAGE TESTS ===\n');

  try {
    // 1. Init Mobile DB
    await initMobileDatabase();
    console.log('✓ Mobile SQLite database initialized');

    // 2. Test 5-Device Location Ingestion
    const devices = [
      { code: 'dev1', lat: 28.6050, lon: 77.3700, val: 88, time: '12:02:00' },
      { code: 'dev2', lat: 28.6055, lon: 77.3710, val: 91, time: '12:02:01' },
      { code: 'dev3', lat: 28.6040, lon: 77.3690, val: 76, time: '12:02:02' },
      { code: 'dev4', lat: 28.6060, lon: 77.3680, val: 83, time: '12:02:03' },
      { code: 'dev5', lat: 28.6070, lon: 77.3720, val: 95, time: '12:02:04' }
    ];

    for (const d of devices) {
      await saveLocationLocally(d.code, d.lat, d.lon, d.val, d.time);
    }
    console.log('✓ 5 devices location packets saved locally into SQLite');

    // 3. Query Latest Locations for normalized marker updates
    const latestLocs = await getLatestDeviceLocationsLocally();
    if (latestLocs.length !== 5) {
      throw new Error(`Expected 5 latest device locations, got ${latestLocs.length}`);
    }
    console.log(`✓ Retrieved ${latestLocs.length} device latest location records from SQLite`);

    // 4. Test Device Marker State Update (New packet for dev3)
    await saveLocationLocally('dev3', 28.6050, 77.2380, 74, '12:05:00');
    const updatedLocs = await getLatestDeviceLocationsLocally();
    const dev3Latest = updatedLocs.find((item: any) => item.device_code === 'dev3');
    if (dev3Latest.latitude === 28.6050 && dev3Latest.longitude === 77.2380 && dev3Latest.battery_level === 74) {
      console.log('✓ dev3 location & marker state update verified in SQLite:', dev3Latest);
    } else {
      throw new Error('dev3 location update failed');
    }

    // 5. Test Offline Public & Private Messaging Storage
    const pubMsgId = await savePublicMessageLocally(1, 1, 'Arun', 'We reached checkpoint 1.', 'msg_client_001', false);
    const privMsgId = await savePrivateMessageLocally(1, 2, 'Arun', 'Where are you?', 'msg_client_002', false);
    console.log(`✓ Offline messages saved to SQLite (Public ID: ${pubMsgId}, Private ID: ${privMsgId})`);

    // 6. Test Sync Queue Generation & Retrieval
    const queue = await getPendingSyncQueue();
    if (queue.length >= 2) {
      console.log(`✓ Sync queue verified with ${queue.length} pending items`);
    } else {
      throw new Error(`Expected at least 2 sync queue items, got ${queue.length}`);
    }

    // 7. Mark Item as Synced
    await markSyncItemCompleted(queue[0].id);
    const updatedQueue = await getPendingSyncQueue();
    if (updatedQueue.length === queue.length - 1) {
      console.log('✓ Queue item status updated to synced successfully');
    } else {
      throw new Error('Queue item status update failed');
    }

    // 8. Test Offline Region Metadata Storage (e.g. Sathy Region)
    const regionId = await addLocalOfflineRegion('Sathy Region', 11.4500, 11.5500, 77.1800, 77.3000, 10932795, 450);
    const regions = await getLocalOfflineRegions();
    if (regions.length > 0 && regions[0].name === 'Sathy Region') {
      console.log('✓ Offline map region metadata saved and retrieved:', regions[0]);
    } else {
      throw new Error('Offline region query failed');
    }

    console.log('\nALL MODULE 3 TESTS PASSED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ MODULE 3 TEST FAILED:', err);
    process.exit(1);
  }
}

runMobileSqliteTests();
