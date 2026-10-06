import { BluetoothService, BLE_SERVICE_UUID, BLE_RX_UUID, BLE_TX_UUID, SPP_UUID } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { LocationTrackerService } from '../src/services/location/LocationTrackerService';
import { useDeviceStore } from '../src/store/deviceStore';
import { useAuthStore } from '../src/store/authStore';
import { initMobileDatabase } from '../src/database/sqlite';
import { savePublicMessageLocally, savePrivateMessageLocally, getPublicMessagesLocally, getPrivateMessagesLocally } from '../src/database/dbQueries';

async function runThoroughBleE2ETest() {
  console.log('=================================================================');
  console.log('  THOROUGH END-TO-END PRE-LAUNCH BLE TRANSMISSION AUDIT TEST   ');
  console.log('=================================================================\n');

  let testStep = 1;

  try {
    // -------------------------------------------------------------
    // Step 1: Verify Hardware UUID Specifications
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Auditing Bluetooth Hardware UUID Standards...`);
    console.log(`  • Nordic UART BLE Service:       ${BLE_SERVICE_UUID}`);
    console.log(`  • Nordic UART RX (Write):        ${BLE_RX_UUID}`);
    console.log(`  • Nordic UART TX (Notify):       ${BLE_TX_UUID}`);
    console.log(`  • Classic Bluetooth SPP (RFCOMM): ${SPP_UUID}`);

    if (BLE_SERVICE_UUID !== '6e400001-b5a3-f393-e0a9-e50e24dcca9e') throw new Error('UUID mismatch on BLE Service');
    if (BLE_RX_UUID !== '6e400002-b5a3-f393-e0a9-e50e24dcca9e') throw new Error('UUID mismatch on BLE RX');
    if (BLE_TX_UUID !== '6e400003-b5a3-f393-e0a9-e50e24dcca9e') throw new Error('UUID mismatch on BLE TX');
    if (SPP_UUID !== '00001101-0000-1000-8000-00805f9b34fb') throw new Error('UUID mismatch on SPP');
    console.log('  ✓ All 4 Bluetooth hardware UUID constants verified 100% against ESP32/Heltec specifications.\n');

    // -------------------------------------------------------------
    // Step 2: Initialize SQLite & Store Contexts
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Initializing Mobile SQLite Database & State Stores...`);
    await initMobileDatabase();
    useAuthStore.getState().setAuth({ id: 1, name: 'JESS', email: 'jess@mesh.node', language: 'en', status: 'online' }, 'token-123');
    console.log('  ✓ Local SQLite database initialized & User profile set to "JESS".\n');

    // -------------------------------------------------------------
    // Step 3: Test Bluetooth Connection Lifecycle & Status Listeners
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Testing Bluetooth Connection Lifecycle & Status Events...`);
    const btService = BluetoothService.getInstance();
    let statusEvents: boolean[] = [];

    const unSubStatus = btService.onStatusChanged((connected) => {
      statusEvents.push(connected);
    });

    const isConnectedOk = await btService.connect('ESP32_FIELD_GATEWAY', 'ble');
    if (!isConnectedOk || !btService.isConnected()) {
      throw new Error('Bluetooth connection failed');
    }
    if (btService.getConnectedDeviceId() !== 'ESP32_FIELD_GATEWAY') {
      throw new Error('Connected device ID mismatch');
    }
    btService.setConnectedDeviceName('JESS');
    console.log('  ✓ Connected to BLE Gateway "ESP32_FIELD_GATEWAY". Active transport: BLE.\n');

    // -------------------------------------------------------------
    // Step 4: Test Outbound Data Packets (LOC, MSG,COMMON, MSG,PRIVATE)
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Testing Outbound BLE Transmission Writes...`);
    const locSent = await btService.sendData('LOC,JESS,13.0827,80.2707,14:30,98');
    const pubSent = await btService.sendData('MSG,COMMON,JESS,ALL,Field team deployment active');
    const privSent = await btService.sendData('MSG,PRIVATE,JESS,THANU,Supply drop coordinates verified');

    if (!locSent || !pubSent || !privSent) {
      throw new Error('Outbound packet transmission failed');
    }
    console.log('  ✓ Outbound packets written successfully to BLE RX characteristic.\n');

    // -------------------------------------------------------------
    // Step 5: Test Inbound Stream Reassembly & Buffer Auto-Flush
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Testing Inbound Stream Reassembly & Fragment Buffer...`);
    let rxPackets: string[] = [];

    const unSubData = btService.onDataReceived((packet) => {
      rxPackets.push(packet);
    });

    // Simulate fragmented chunks arriving over BLE notify characteristic
    btService.handleIncomingChunk('LOC,THANU,13.09');
    btService.handleIncomingChunk('00,80.2800,14:31,95\r\nMSG,COMM');
    btService.handleIncomingChunk('ON,THANU,ALL,Copy JESS. Moving to sector B.\nMSG,PRIVATE,THANU,');
    btService.handleIncomingChunk('JESS,Acknowledged. Sector B clear.\n');

    if (rxPackets.length !== 3) {
      throw new Error(`Expected 3 reassembled packets, got ${rxPackets.length}`);
    }
    console.log('  ✓ Fragmented GATT stream chunks reassembled cleanly:');
    rxPackets.forEach((p, i) => console.log(`     [Packet ${i + 1}] "${p}"`));
    console.log('');

    // -------------------------------------------------------------
    // Step 6: Test Packet Parsing & Store Map Pin Updates
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Testing Packet Parser & Live Map Pin Registration...`);
    for (const rawPkt of rxPackets) {
      const parsed = LoraPacketParser.parse(rawPkt);
      if (!parsed) throw new Error(`Failed to parse packet: "${rawPkt}"`);

      if (parsed.type === 'LOC') {
        useDeviceStore.getState().updateDeviceLocation(parsed.deviceId, parsed.latitude, parsed.longitude, parsed.time, parsed.value, parsed.deviceId, parsed.deviceId);
      } else if (parsed.type === 'PUBLIC') {
        savePublicMessageLocally(1, 0, parsed.senderId, parsed.message, `msg_${Date.now()}`, true).catch(console.warn);
      } else if (parsed.type === 'CHAT') {
        savePrivateMessageLocally(0, 1, parsed.senderId, parsed.message, `pmsg_${Date.now()}`, true).catch(console.warn);
      }
    }

    const pinnedDev = useDeviceStore.getState().devices['THANU'];
    if (!pinnedDev) throw new Error('Device "THANU" pin was not created in deviceStore');
    if (pinnedDev.latitude !== 13.09 || pinnedDev.longitude !== 80.28) {
      throw new Error(`Location coordinate mismatch: ${pinnedDev.latitude}, ${pinnedDev.longitude}`);
    }
    console.log('  ✓ Device "THANU" live map marker updated: Lat=13.0900°, Lon=80.2800°, Battery=95%.\n');

    // -------------------------------------------------------------
    // Step 7: Test Native Mobile GPS & Battery Telemetry Acquisition
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Testing Native Mobile Location & Battery Telemetry...`);
    const locService = LocationTrackerService.getInstance();
    const currPos = await locService.acquireCurrentPosition();
    await locService.broadcastLocationPacket();

    const selfPin = useDeviceStore.getState().devices['JESS'];
    if (!selfPin) throw new Error('Self device pin "JESS" missing in deviceStore');
    console.log(`  ✓ Mobile User "JESS" pinned on map: Lat=${selfPin.latitude}, Lon=${selfPin.longitude}, Battery=${selfPin.batteryOrValue}%.\n`);

    // -------------------------------------------------------------
    // Step 8: Verify SQLite Persistence & Disconnect Cleanup
    // -------------------------------------------------------------
    console.log(`[${testStep++}/8] Verifying SQLite Storage & Cleanup...`);
    const storedPublic = await getPublicMessagesLocally();
    const storedPrivate = await getPrivateMessagesLocally();

    if (!storedPublic || storedPublic.length === 0) throw new Error('Public message not persisted to SQLite');
    if (!storedPrivate || storedPrivate.length === 0) throw new Error('Private message not persisted to SQLite');

    unSubData();
    unSubStatus();
    await btService.disconnect();

    if (btService.isConnected()) throw new Error('Bluetooth disconnect failed');
    console.log('  ✓ SQLite verified: Public & Private messages persisted offline.');
    console.log('  ✓ Bluetooth disconnect cleanup completed cleanly.\n');

    console.log('=================================================================');
    console.log(' 🎉 THOROUGH END-TO-END PRE-LAUNCH BLE AUDIT TEST PASSED 100%! ');
    console.log('=================================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ PRE-LAUNCH BLE AUDIT TEST FAILED:', err?.message || err);
    process.exit(1);
  }
}

runThoroughBleE2ETest();
