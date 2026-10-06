import { BluetoothService, BLE_SERVICE_UUID, BLE_RX_UUID, BLE_TX_UUID, SPP_UUID } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';

async function testBleConnection() {
  console.log('===========================================================');
  console.log('  TESTING BLE & CLASSIC BLUETOOTH CONNECTION & PROTOCOL   ');
  console.log('===========================================================');

  try {
    // 1. Verify Standard BLE & SPP UUID Specifications
    console.log('\n[1/5] Checking Bluetooth Service UUID Constants...');
    console.log('  - BLE Service UUID: ', BLE_SERVICE_UUID);
    console.log('  - BLE RX Characteristic (Write):', BLE_RX_UUID);
    console.log('  - BLE TX Characteristic (Notify):', BLE_TX_UUID);
    console.log('  - Classic Bluetooth SPP UUID:    ', SPP_UUID);

    if (BLE_SERVICE_UUID !== '6e400001-b5a3-f393-e0a9-e50e24dcca9e') {
      throw new Error('BLE Service UUID does not match ESP32 Nordic UART specification!');
    }
    if (BLE_RX_UUID !== '6e400002-b5a3-f393-e0a9-e50e24dcca9e' || BLE_TX_UUID !== '6e400003-b5a3-f393-e0a9-e50e24dcca9e') {
      throw new Error('BLE RX/TX Characteristic UUIDs do not match ESP32 GATT specification!');
    }
    console.log('  ✓ Bluetooth UUID constants verified against ESP32 firmware specs.');

    // 2. Test Connection Lifecycle
    console.log('\n[2/5] Testing Connection State Management...');
    const btService = BluetoothService.getInstance();
    
    let statusLog: boolean[] = [];
    btService.onStatusChanged((connected) => {
      statusLog.push(connected);
    });

    const connected = await btService.connect('ESP32_JESS_GATEWAY', 'ble');
    if (!connected || !btService.isConnected()) {
      throw new Error('BluetoothService failed to transition to connected state');
    }
    if (btService.getConnectedDeviceId() !== 'ESP32_JESS_GATEWAY') {
      throw new Error('Connected device ID mismatch');
    }
    if (btService.getTransportType() !== 'ble') {
      throw new Error('Transport type mismatch');
    }
    console.log('  ✓ Connected to ESP32 Gateway (BLE mode active)');

    // 3. Test Handshake & Outbound Data Transmission
    console.log('\n[3/5] Testing Outbound Handshake & Packet Transmission...');
    const sentLoc = await btService.sendData('LOC,JESS,13.0827,80.2707,14:30,100');
    const sentPublic = await btService.sendData('MSG,COMMON,JESS,ALL,All nodes operational');
    const sentPrivate = await btService.sendData('MSG,PRIVATE,JESS,THANU,Direct message to node 1');

    if (!sentLoc || !sentPublic || !sentPrivate) {
      throw new Error('Failed to transmit data through BluetoothService');
    }
    console.log('  ✓ Transmitted LOC, MSG,COMMON, and MSG,PRIVATE packets successfully');

    // 4. Test Incoming GATT Stream Chunk Line-Buffering
    console.log('\n[4/5] Testing Incoming GATT Stream Buffer Chunk Decoder...');
    let receivedPackets: string[] = [];
    btService.onDataReceived((packet) => {
      receivedPackets.push(packet);
    });

    // Simulate fragmented byte chunks arriving from ESP32 notify characteristic
    btService.handleIncomingChunk('LOC,THANU,13.0');
    btService.handleIncomingChunk('825,80.2710,14:31,95\r\nMSG,COMM');
    btService.handleIncomingChunk('ON,THANU,ALL,Copy that JESS\nMSG,PRIVATE,THANU,');
    btService.handleIncomingChunk('JESS,Received private packet\n');

    if (receivedPackets.length !== 3) {
      throw new Error(`Expected 3 complete packets, got ${receivedPackets.length}`);
    }

    if (!receivedPackets[0].startsWith('LOC,THANU')) {
      throw new Error(`Packet 1 mismatch: ${receivedPackets[0]}`);
    }
    if (!receivedPackets[1].startsWith('MSG,COMMON,THANU')) {
      throw new Error(`Packet 2 mismatch: ${receivedPackets[1]}`);
    }
    if (!receivedPackets[2].startsWith('MSG,PRIVATE,THANU')) {
      throw new Error(`Packet 3 mismatch: ${receivedPackets[2]}`);
    }
    console.log('  ✓ Reassembled fragmented stream chunks cleanly:');
    receivedPackets.forEach((p, idx) => console.log(`     Packet ${idx + 1}: "${p}"`));

    // 5. Test LoraPacketParser Parsing of Received Packets
    console.log('\n[5/5] Testing Packet Parser Compatibility with ESP32 Packets...');
    const parsedLoc = LoraPacketParser.parse(receivedPackets[0]);
    const parsedCommon = LoraPacketParser.parse(receivedPackets[1]);
    const parsedPrivate = LoraPacketParser.parse(receivedPackets[2]);

    if (!parsedLoc || parsedLoc.type !== 'LOC' || parsedLoc.deviceId !== 'THANU') {
      throw new Error('Failed to parse incoming LOC packet from ESP32');
    }
    if (!parsedCommon || parsedCommon.type !== 'PUBLIC' || parsedCommon.senderId !== 'THANU') {
      throw new Error('Failed to parse incoming MSG,COMMON packet from ESP32');
    }
    if (!parsedPrivate || parsedPrivate.type !== 'CHAT' || parsedPrivate.senderId !== 'THANU' || parsedPrivate.receiverId !== 'JESS') {
      throw new Error('Failed to parse incoming MSG,PRIVATE packet from ESP32');
    }

    console.log('  ✓ Parsed LOC packet:', parsedLoc);
    console.log('  ✓ Parsed MSG,COMMON packet:', parsedCommon);
    console.log('  ✓ Parsed MSG,PRIVATE packet:', parsedPrivate);

    // Disconnect
    await btService.disconnect();
    if (btService.isConnected()) {
      throw new Error('Failed to disconnect cleanly');
    }

    console.log('\n===========================================================');
    console.log(' 🎉 ALL BLE CONNECTION & PROTOCOL TESTS PASSED!          ');
    console.log('===========================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ BLE TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

testBleConnection();
