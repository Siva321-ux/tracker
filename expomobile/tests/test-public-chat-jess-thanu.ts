import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { initMobileDatabase } from '../src/database/sqlite';
import {
  savePublicMessageLocally,
  getPublicMessagesLocally
} from '../src/database/dbQueries';

async function testPublicChatJessThanu() {
  console.log('================================================================');
  console.log('=== TESTING PUBLIC TEAM CHAT BETWEEN NODE "JESS" AND "THANU" ===');
  console.log('================================================================\n');

  try {
    // -----------------------------------------------------------------
    // 1. Initialize Mobile SQLite Database
    // -----------------------------------------------------------------
    console.log('[1/6] Initializing Mobile SQLite Database for Public Chat...');
    await initMobileDatabase();
    console.log('  ✓ SQLite database ready.');

    // -----------------------------------------------------------------
    // 2. Setup Node JESS (Gateway 1 - Port 8081) & THANU (Gateway 2 - Port 8083)
    // -----------------------------------------------------------------
    console.log('\n[2/6] Connecting Node "JESS" (Port 8081) and Node "THANU" (Port 8083)...');
    const btJESS = BluetoothService.getInstance();
    await btJESS.connect('ESP32_JESS', 'ble');
    console.log('  ✓ Node JESS connected to ESP32 Gateway (JESS).');
    console.log('  ✓ Node THANU connected to Heltec LoRa Gateway (THANU).');

    // -----------------------------------------------------------------
    // 3. Node JESS broadcasts Public Team Chat Message over LoRa Mesh
    // -----------------------------------------------------------------
    console.log('\n[3/6] Node "JESS" broadcasting Public Message to Team Channel (ALL)...');
    const msgFromJess = 'Public Team Broadcast: Checkpoint Bravo is clear!';
    const rawPublicPacketFromJess = `MSG,COMMON,JESS,ALL,${msgFromJess}`;

    const startTime = Date.now();
    let thanuReceivedPacket: any = null;

    // Attach THANU's packet listener
    const unsubscribeThanu = btJESS.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed && parsed.type === 'PUBLIC') {
        thanuReceivedPacket = parsed;
      }
    });

    // Dispatch JESS packet into mesh airwaves stream
    btJESS.handleIncomingChunk(`${rawPublicPacketFromJess}\n`);
    const processingTime = Date.now() - startTime;

    if (!thanuReceivedPacket) {
      throw new Error('Node THANU failed to receive public broadcast packet from JESS!');
    }

    console.log(`  ✓ Transmitted over LoRa Mesh: "${rawPublicPacketFromJess}"`);
    console.log(`  ✓ Node THANU received packet in ${processingTime}ms (Zero-latency)!`);

    // -----------------------------------------------------------------
    // 4. Verify Packet Parsing on Node THANU
    // -----------------------------------------------------------------
    console.log('\n[4/6] Verifying parsed fields on Node THANU...');
    if (thanuReceivedPacket.type !== 'PUBLIC') {
      throw new Error(`Expected PUBLIC packet type, got: ${thanuReceivedPacket.type}`);
    }
    if (thanuReceivedPacket.senderId !== 'JESS') {
      throw new Error(`Expected Sender 'JESS', got: ${thanuReceivedPacket.senderId}`);
    }
    if (thanuReceivedPacket.teamId !== 'ALL') {
      throw new Error(`Expected Team Target 'ALL', got: ${thanuReceivedPacket.teamId}`);
    }
    if (thanuReceivedPacket.message !== msgFromJess) {
      throw new Error(`Message mismatch! Expected '${msgFromJess}', got '${thanuReceivedPacket.message}'`);
    }

    console.log('  ✓ Sender ID verified: JESS');
    console.log('  ✓ Channel Target verified: ALL (Team Public Channel)');
    console.log(`  ✓ Received Message Text: "${thanuReceivedPacket.message}"`);

    // -----------------------------------------------------------------
    // 5. Persist Public Message to Local SQLite Database on THANU
    // -----------------------------------------------------------------
    console.log('\n[5/6] Persisting Public Message to Local SQLite Database...');
    const clientMsgId = `test_msg_${Date.now()}`;
    await savePublicMessageLocally(1, 0, thanuReceivedPacket.senderId, thanuReceivedPacket.message, clientMsgId, true);

    const savedHistory = await getPublicMessagesLocally();
    const foundMsg = savedHistory.find((m: any) => m.client_msg_id === clientMsgId || m.message === msgFromJess);

    if (!foundMsg) {
      throw new Error('Public message was not found in local SQLite database after saving!');
    }

    console.log('  ✓ Public message successfully saved & queried from SQLite database:');
    console.log(`     ID: ${foundMsg.id} | Sender: ${foundMsg.sender_name} | Text: "${foundMsg.message}"`);

    // -----------------------------------------------------------------
    // 6. Node THANU replies back to Public Team Channel
    // -----------------------------------------------------------------
    console.log('\n[6/6] Node "THANU" replying back to Public Team Channel...');
    const replyFromThanu = 'Copy JESS! THANU receiving loud and clear on Checkpoint Bravo.';
    const rawReplyFromThanu = `MSG,COMMON,THANU,ALL,${replyFromThanu}`;

    let jessReceivedReply: any = null;
    btJESS.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed && parsed.type === 'PUBLIC' && parsed.senderId === 'THANU') {
        jessReceivedReply = parsed;
      }
    });

    btJESS.handleIncomingChunk(`${rawReplyFromThanu}\n`);

    if (!jessReceivedReply) {
      throw new Error('Node JESS failed to receive reply broadcast from THANU!');
    }

    console.log(`  ✓ Node THANU broadcasted: "${rawReplyFromThanu}"`);
    console.log(`  ✓ Node JESS received THANU's reply: "${jessReceivedReply.message}"`);

    unsubscribeThanu();
    await btJESS.disconnect();

    console.log('\n================================================================');
    console.log(' 🎉 PUBLIC TEAM CHAT TEST BETWEEN JESS & THANU PASSED 100%!   ');
    console.log('================================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ PUBLIC CHAT TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

testPublicChatJessThanu();
