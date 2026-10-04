import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraSimulator } from '../src/services/lora/LoraSimulator';

async function runModule2Tests() {
  console.log('=== RUNNING MODULE 2 LORA PACKET PARSER & HARDWARE/SIMULATOR TESTS ===\n');

  try {
    // 1. Test Valid Location Packets
    const validLoc = 'LOC,dev1,28.6050,77.3700,12:02:00,88';
    const parsedLoc = LoraPacketParser.parse(validLoc);

    if (!parsedLoc || parsedLoc.type !== 'LOC') throw new Error('Failed to parse valid LOC packet');
    if (parsedLoc.deviceId !== 'dev1' || parsedLoc.latitude !== 28.605 || parsedLoc.longitude !== 77.37 || parsedLoc.value !== 88) {
      throw new Error(`Parsed values incorrect: ${JSON.stringify(parsedLoc)}`);
    }
    console.log('✓ Valid LOC packet parsed correctly:', parsedLoc);

    // 2. Test Invalid Coordinate Validation (Latitude out of bounds: 999)
    const invalidLat = 'LOC,dev1,999.0000,77.3700,12:02:00,88';
    const parsedInvalidLat = LoraPacketParser.parse(invalidLat);
    if (parsedInvalidLat === null) {
      console.log('✓ Out-of-bounds latitude (999.0) correctly rejected');
    } else {
      throw new Error('Out-of-bounds latitude was not rejected');
    }

    // 3. Test Invalid Coordinate Validation (Longitude out of bounds: -200)
    const invalidLon = 'LOC,dev2,28.6050,-200.0000,12:02:00,50';
    const parsedInvalidLon = LoraPacketParser.parse(invalidLon);
    if (parsedInvalidLon === null) {
      console.log('✓ Out-of-bounds longitude (-200.0) correctly rejected');
    } else {
      throw new Error('Out-of-bounds longitude was not rejected');
    }

    // 4. Test Chat Packet Parsing
    const chatPacket = 'CHAT,userA,userB,Where are you near checkpoint 2?';
    const parsedChat = LoraPacketParser.parse(chatPacket);
    if (parsedChat && parsedChat.type === 'CHAT' && parsedChat.senderId === 'userA' && parsedChat.receiverId === 'userB' && parsedChat.message === 'Where are you near checkpoint 2?') {
      console.log('✓ Chat packet parsed correctly:', parsedChat);
    } else {
      throw new Error('Failed to parse CHAT packet');
    }

    // 5. Test Public Packet Parsing
    const pubPacket = 'PUBLIC,userA,team1,Moving toward checkpoint 2';
    const parsedPub = LoraPacketParser.parse(pubPacket);
    if (parsedPub && parsedPub.type === 'PUBLIC' && parsedPub.teamId === 'team1') {
      console.log('✓ Public team packet parsed correctly:', parsedPub);
    } else {
      throw new Error('Failed to parse PUBLIC packet');
    }

    // 6. Test Status Packet Parsing
    const statusPacket = 'STATUS,dev3,offline';
    const parsedStatus = LoraPacketParser.parse(statusPacket);
    if (parsedStatus && parsedStatus.type === 'STATUS' && parsedStatus.deviceId === 'dev3' && parsedStatus.status === 'offline') {
      console.log('✓ Status packet parsed correctly:', parsedStatus);
    } else {
      throw new Error('Failed to parse STATUS packet');
    }

    // 7. Test Bluetooth Service & Simulator Pipeline Integration
    let receivedPackets: string[] = [];
    const btService = BluetoothService.getInstance();
    btService.onDataReceived((raw) => {
      receivedPackets.push(raw);
    });

    const simulator = LoraSimulator.getInstance();
    simulator.generateSinglePacket('dev5', 28.6070, 77.3720, 95);

    if (receivedPackets.length > 0 && receivedPackets[0].includes('dev5')) {
      console.log('✓ Bluetooth & LoRa Simulator pipeline integration PASSED:', receivedPackets[0]);
    } else {
      throw new Error('Simulator failed to emit packet through BluetoothService');
    }

    console.log('\nALL MODULE 2 TESTS PASSED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ MODULE 2 TEST FAILED:', err);
    process.exit(1);
  }
}

runModule2Tests();
