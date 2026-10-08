import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { useDeviceStore } from '../src/store/deviceStore';

async function testPersonalAntennaMesh() {
  console.log('===========================================================');
  console.log('  TESTING PERSONAL ESP32 ANTENNA & LORA MESH PIPELINE      ');
  console.log('===========================================================');

  try {
    // -----------------------------------------------------------------
    // SIMULATED SETUP:
    // Laptop 1 connects to Personal Antenna 1 (ESP32 Node "JESS")
    // Laptop 2 connects to Personal Antenna 2 (ESP32 Node "THANU")
    // -----------------------------------------------------------------
    console.log('\n[1/4] Connecting Laptop 1 to Personal Antenna (ESP32 "JESS")...');
    const btService1 = BluetoothService.getInstance();
    await btService1.connect('JESS', 'ble');
    
    // Register Laptop 1's local identity as JESS
    useDeviceStore.getState().updateDeviceLocation('JESS', 13.0827, 80.2707, '15:58', 100, 'JESS', 'JESS');
    console.log('  ✓ Laptop 1 connected to ESP32 "JESS" personal radio antenna.');

    // -----------------------------------------------------------------
    // 2. Laptop 1 sends GPS telemetry through ESP32 JESS
    // -----------------------------------------------------------------
    console.log('\n[2/4] Laptop 1 streaming GPS location coordinates via Antenna JESS...');
    const gpsPacket = 'LOC,JESS,13.0827,80.2707,15:58,100';
    const sentLoc = await btService1.sendData(gpsPacket);

    if (!sentLoc) throw new Error('Failed to transmit GPS coordinates to ESP32 JESS');
    console.log(`  ✓ Transmitted over BLE to Antenna JESS: "${gpsPacket}"`);
    console.log('  -> Antenna JESS forwards packet over E220 LoRa Radio (433MHz)');

    // -----------------------------------------------------------------
    // 3. Radio Signal Received by Personal Antenna 2 (ESP32 "THANU")
    // -----------------------------------------------------------------
    console.log('\n[3/4] Antenna THANU receives airborne LoRa signal & notifies Laptop 2...');
    let laptop2ReceivedPackets: any[] = [];

    // Simulate Laptop 2's packet listener
    btService1.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed) laptop2ReceivedPackets.push(parsed);
    });

    // Antenna THANU notifies Laptop 2 over Bluetooth with received LoRa packets
    btService1.handleIncomingChunk('LOC,JESS,13.0827,80.2707,15:58,100\n');
    btService1.handleIncomingChunk('MSG,PRIVATE,JESS,THANU,Check point B coordinates\n');

    if (laptop2ReceivedPackets.length !== 2) {
      throw new Error(`Expected 2 packets on Laptop 2, received ${laptop2ReceivedPackets.length}`);
    }

    // -----------------------------------------------------------------
    // 4. Verify Laptop 2 receives JESS's GPS pin & private message
    // -----------------------------------------------------------------
    console.log('\n[4/4] Verifying Laptop 2 received JESS\'s GPS pin & private message...');
    const rxLoc = laptop2ReceivedPackets[0];
    const rxChat = laptop2ReceivedPackets[1];

    if (rxLoc.type !== 'LOC' || rxLoc.deviceId !== 'JESS' || rxLoc.latitude !== 13.0827 || rxLoc.longitude !== 80.2707) {
      throw new Error(`Invalid GPS packet received on Laptop 2: ${JSON.stringify(rxLoc)}`);
    }

    if (rxChat.type !== 'CHAT' || rxChat.senderId !== 'JESS' || rxChat.receiverId !== 'THANU' || rxChat.message !== 'Check point B coordinates') {
      throw new Error(`Invalid Private Chat packet received on Laptop 2: ${JSON.stringify(rxChat)}`);
    }

    // Update Laptop 2's Device Store with JESS's GPS pin
    useDeviceStore.getState().updateDeviceLocation(rxLoc.deviceId, rxLoc.latitude, rxLoc.longitude, rxLoc.time, rxLoc.value, rxLoc.deviceId, rxLoc.deviceId);

    const devicesLaptop2 = useDeviceStore.getState().devices;
    if (!devicesLaptop2['JESS']) {
      throw new Error('JESS marker missing from Laptop 2 map store!');
    }

    console.log('  ✓ Laptop 2 map updated with JESS\'s live GPS pin:');
    console.log(`     Device: ${devicesLaptop2['JESS'].deviceId} | Lat: ${devicesLaptop2['JESS'].latitude}° N | Lon: ${devicesLaptop2['JESS'].longitude}° E`);
    console.log('  ✓ Laptop 2 private chat received message under Sender "JESS":');
    console.log(`     From: ${rxChat.senderId} | To: ${rxChat.receiverId} | Message: "${rxChat.message}"`);

    await btService1.disconnect();

    console.log('\n===========================================================');
    console.log(' 🎉 PERSONAL ANTENNA & LORA MESH TEST PASSED!            ');
    console.log('===========================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ ANTENNA TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

testPersonalAntennaMesh();
