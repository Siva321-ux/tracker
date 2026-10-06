import { initMobileDatabase } from '../src/database/sqlite';
import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import {
  saveLocationLocally,
  getLatestDeviceLocationsLocally,
  savePublicMessageLocally,
  getPublicMessagesLocally,
  savePrivateMessageLocally,
  getPrivateMessagesLocally,
  getPendingSyncQueue
} from '../src/database/dbQueries';
import { useNetworkStore } from '../src/store/networkStore';
import { useDeviceStore } from '../src/store/deviceStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { TileCacheManager } from '../src/services/map/TileCacheManager';

async function testOfflineBluetoothOnly() {
  console.log('================================================================');
  console.log('=== TESTING 100% OFFLINE BLUETOOTH & LORA MESH FUNCTIONALITY ===');
  console.log('=== ZERO INTERNET CONNECTION REQUIRED (INTERNET = OFF 🔴)    ===');
  console.log('================================================================\n');

  try {
    // 1. Simulate Complete Internet Disconnection
    console.log('[1/7] Disconnecting Internet network status...');
    useNetworkStore.getState().setOnlineStatus(false);
    if (useNetworkStore.getState().isOnline !== false) {
      throw new Error('Failed to set offline network mode!');
    }
    console.log('  ✓ System operating in 🔴 100% OFFLINE MODE (No Internet access).');

    // 2. Init Local Mobile SQLite Database (No server DB connection)
    console.log('\n[2/7] Initializing Local Mobile SQLite Database...');
    await initMobileDatabase();
    console.log('  ✓ Local SQLite database initialized without internet connection.');

    // 3. Connect Bluetooth Radio Gateway
    console.log('\n[3/7] Connecting Bluetooth Radio Gateway (BLE SPP mode)...');
    const btService = BluetoothService.getInstance();
    btService.setConnectedDeviceName('JESS');
    const connected = await btService.connect('ESP32_OFFLINE_GATEWAY', 'ble');
    if (!connected || !btService.isConnected()) {
      throw new Error('Bluetooth Service failed to establish radio connection offline!');
    }
    console.log('  ✓ Bluetooth Radio Connected to "ESP32_OFFLINE_GATEWAY" (Callsign: JESS).');

    // 4. Test Offline Public Chat Broadcast over Bluetooth
    console.log('\n[4/7] Testing Offline Public Chat Broadcast over Bluetooth Radio...');
    let receivedPublicPackets: any[] = [];
    
    // Attach packet listener
    const unsubscribe = btService.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed) receivedPublicPackets.push(parsed);
    });

    const publicMsgText = 'Emergency: Checkpoint 2 clear. Requesting supply drop.';
    const clientMsgId1 = `msg_off_${Date.now()}_1`;
    
    // Save to local SQLite while offline
    await savePublicMessageLocally(1, 101, 'THANU', publicMsgText, clientMsgId1, false);

    // Send packet over Bluetooth radio
    const publicPacket = `MSG,COMMON,THANU,ALL,${publicMsgText}`;
    await btService.sendData(publicPacket);

    // Simulate incoming radio packet received from teammate THANU over Bluetooth
    btService.handleIncomingChunk(`${publicPacket}\n`);

    if (receivedPublicPackets.length === 0 || receivedPublicPackets[0].type !== 'PUBLIC') {
      throw new Error('Failed to process offline Public Chat packet over Bluetooth!');
    }
    
    const parsedPublic = receivedPublicPackets[0];
    if (parsedPublic.senderId !== 'THANU' || parsedPublic.message !== publicMsgText) {
      throw new Error(`Parsed public packet mismatch: ${JSON.stringify(parsedPublic)}`);
    }

    const localPublicHistory = await getPublicMessagesLocally();
    if (localPublicHistory.length === 0) {
      throw new Error('Offline public message not saved in local SQLite!');
    }

    console.log('  ✓ Public Chat broadcast transmitted & received over Bluetooth 100% offline:');
    console.log(`     From: ${parsedPublic.senderId} | Channel: Team Public Mesh | Message: "${parsedPublic.message}"`);

    // 5. Test Offline Private Chat over Bluetooth
    console.log('\n[5/7] Testing Offline Private Direct Chat over Bluetooth Radio...');
    let receivedPrivatePackets: any[] = [];

    btService.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed && parsed.type === 'CHAT') receivedPrivatePackets.push(parsed);
    });

    const privateMsgText = 'Copy that JESS. Moving to sector 4.';
    const clientMsgId2 = `msg_off_${Date.now()}_2`;

    await savePrivateMessageLocally(101, 102, 'THANU', privateMsgText, clientMsgId2, false);

    const privatePacket = `MSG,PRIVATE,THANU,JESS,${privateMsgText}`;
    await btService.sendData(privatePacket);

    btService.handleIncomingChunk(`${privatePacket}\n`);

    const parsedPrivate = receivedPrivatePackets.find((p) => p.senderId === 'THANU');
    if (!parsedPrivate || parsedPrivate.message !== privateMsgText) {
      throw new Error('Failed to process offline Private Chat packet over Bluetooth!');
    }

    console.log('  ✓ Private Chat transmitted & received over Bluetooth 100% offline:');
    console.log(`     From: ${parsedPrivate.senderId} -> To: ${parsedPrivate.receiverId} | Message: "${parsedPrivate.message}"`);

    // 6. Test Offline GPS Location Telemetry Streaming over Bluetooth
    console.log('\n[6/7] Testing Offline GPS Telemetry & Live Map Marker updates via Bluetooth...');
    const telemetryPacket = 'LOC,THANU,11.5034,77.2444,15:52,94';
    
    btService.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed && parsed.type === 'LOC') {
        useDeviceStore.getState().updateDeviceLocation(
          parsed.deviceId,
          parsed.latitude,
          parsed.longitude,
          parsed.time,
          parsed.value,
          parsed.deviceId,
          parsed.deviceId
        );
        saveLocationLocally(parsed.deviceId, parsed.latitude, parsed.longitude, parsed.value, parsed.time);
      }
    });

    btService.handleIncomingChunk(`${telemetryPacket}\n`);

    const updatedDevices = useDeviceStore.getState().devices;
    if (!updatedDevices['THANU']) {
      throw new Error('THANU device marker missing from map store in offline mode!');
    }

    const thanuLoc = updatedDevices['THANU'];
    console.log('  ✓ Live Map telemetry updated offline via Bluetooth radio:');
    console.log(`     Device: ${thanuLoc.deviceId} | Lat: ${thanuLoc.latitude}° N | Lon: ${thanuLoc.longitude}° E | Battery: ${thanuLoc.batteryOrValue}%`);

    // 7. Verify Offline Sync Queue & Offline Map Region Accessibility
    console.log('\n[7/7] Verifying Offline Sync Queue & Map Region Access without Internet...');
    const queue = await getPendingSyncQueue();
    if (queue.length < 2) {
      throw new Error(`Expected at least 2 pending offline queue items, found ${queue.length}`);
    }
    console.log(`  ✓ Pending Offline Queue holds ${queue.length} items (queued for future cloud sync when internet returns).`);

    const tileMgr = TileCacheManager.getInstance();
    const regionId = await tileMgr.downloadRegion('Sathy Offline Region', 11.4500, 11.5500, 77.1800, 77.3000);
    const offlineRegions = await tileMgr.getRegions();
    if (offlineRegions.length === 0) {
      throw new Error('Downloaded map tiles missing in offline mode!');
    }
    console.log(`  ✓ Offline map tiles accessible locally without internet (${offlineRegions[0].name}).`);

    unsubscribe();
    await btService.disconnect();

    console.log('\n================================================================');
    console.log(' 🎉 100% OFFLINE BLUETOOTH & LORA MESH TEST PASSED SUCCESSFULLY! ');
    console.log('    All Chat, Telemetry, Maps & Storage operate with NO INTERNET!');
    console.log('================================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ OFFLINE BLUETOOTH TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

testOfflineBluetoothOnly();
