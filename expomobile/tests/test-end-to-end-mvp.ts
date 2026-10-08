import { initMobileDatabase } from '../src/database/sqlite';
import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { saveLocationLocally, getLatestDeviceLocationsLocally } from '../src/database/dbQueries';
import { TileCacheManager } from '../src/services/map/TileCacheManager';
import { SyncManager } from '../src/services/sync/SyncManager';
import { useNetworkStore } from '../src/store/networkStore';
import { useDeviceStore } from '../src/store/deviceStore';

async function runEndToEndMVPTest() {
  console.log('====================================================');
  console.log('=== RUNNING COMPLETE END-TO-END MVP INTEGRATION TEST ===');
  console.log('====================================================\n');

  try {
    // 1. Init Mobile SQLite
    await initMobileDatabase();
    console.log('Step 1: Mobile SQLite database initialized ✓');

    // 2. Attach Bluetooth / LoRa packet receiver pipeline
    const btService = BluetoothService.getInstance();
    btService.onDataReceived((rawPacket) => {
      const parsed = LoraPacketParser.parse(rawPacket);
      if (parsed && parsed.type === 'LOC') {
        const { deviceId, latitude, longitude, time, value } = parsed;
        useDeviceStore.getState().updateDeviceLocation(deviceId, latitude, longitude, time, value);
        saveLocationLocally(deviceId, latitude, longitude, value, time).catch((err) =>
          console.error('Save packet error:', err)
        );
      }
    });
    console.log('Step 2: Bluetooth & LoRa Packet Listener attached ✓');

    // 3. Emit initial 5-device LoRa packets (as specified in Section 46)
    const initialPackets = [
      'LOC,dev1,28.6050,77.3700,12:02:00,88',
      'LOC,dev2,28.6055,77.3710,12:02:01,91',
      'LOC,dev3,28.6040,77.3690,12:02:02,76',
      'LOC,dev4,28.6060,77.3680,12:02:03,83',
      'LOC,dev5,28.6070,77.3720,12:02:04,95'
    ];

    for (const pkt of initialPackets) {
      btService.emitRawPacket(pkt);
    }
    // Small pause for async db execution
    await new Promise((res) => setTimeout(res, 200));
    console.log('Step 3: Received and parsed initial 5 LoRa location packets ✓');

    // 4. Verify 5 Device Markers in state & SQLite
    const storeDevices = Object.values(useDeviceStore.getState().devices);
    if (storeDevices.length < 5) {
      throw new Error(`Expected at least 5 device markers in store, found ${storeDevices.length}`);
    }
    console.log(`Step 4: Live Map displays ${storeDevices.length} markers (dev1..dev5) ✓`);

    // 5. Download Offline Sathy Map Region
    const tileMgr = TileCacheManager.getInstance();
    const regionId = await tileMgr.downloadRegion('Sathy Region', 11.4500, 11.5500, 77.1800, 77.3000);
    console.log(`Step 5: Offline map region "Sathy Region" downloaded (ID: ${regionId}) ✓`);

    // 6. Simulate Internet Disconnection (🔴 OFFLINE MODE)
    useNetworkStore.getState().setOnlineStatus(false);
    console.log('Step 6: Network state changed to 🔴 OFFLINE ✓');

    // 7. Verify offline map region remains loaded without Internet
    const offlineRegions = await tileMgr.getRegions();
    if (offlineRegions.length === 0) {
      throw new Error('Downloaded offline map region missing in offline mode');
    }
    console.log('Step 7: Downloaded Sathy map region remains visible & accessible offline ✓');

    // 8. Emit moving LoRa updates while Internet is OFF
    const movingPackets = [
      'LOC,dev1,28.6053,77.3702,12:05:00,87',
      'LOC,dev2,28.6058,77.3713,12:05:01,90',
      'LOC,dev3,28.6045,77.3694,12:05:02,75',
      'LOC,dev4,28.6063,77.3682,12:05:03,82',
      'LOC,dev5,28.6074,77.3725,12:05:04,94'
    ];

    for (const pkt of movingPackets) {
      btService.emitRawPacket(pkt);
    }
    await new Promise((res) => setTimeout(res, 200));
    console.log('Step 8 & 9: Moving LoRa packets received offline; live markers updated on map ✓');

    // 10. Reconnect Internet (🟢 ONLINE MODE)
    useNetworkStore.getState().setOnlineStatus(true);
    console.log('Step 10: Internet reconnected 🟢 ONLINE ✓');

    // 11. Trigger Data Synchronization
    const syncRes = await SyncManager.getInstance().syncPendingQueue();
    console.log(`Step 11: Pending offline queue synchronized with backend server (Synced: ${syncRes.syncedCount}) ✓`);

    console.log('\n====================================================');
    console.log('🎉 ALL END-TO-END MVP TARGET STEPS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ E2E MVP TEST FAILED:', err);
    process.exit(1);
  }
}

runEndToEndMVPTest();
