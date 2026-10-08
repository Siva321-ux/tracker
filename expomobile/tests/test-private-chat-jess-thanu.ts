import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { initMobileDatabase } from '../src/database/sqlite';
import {
  savePrivateMessageLocally,
  getPrivateMessagesLocally
} from '../src/database/dbQueries';

async function testPrivateChatJessThanu() {
  console.log('=================================================================');
  console.log('=== TESTING PRIVATE DIRECT CHAT BETWEEN NODE "JESS" AND "THANU" ===');
  console.log('=================================================================\n');

  try {
    // 1. Database Init
    console.log('[1/5] Initializing Mobile SQLite Database...');
    await initMobileDatabase();
    console.log('  ✓ SQLite database ready.');

    // 2. Connect Nodes
    console.log('\n[2/5] Establishing Bluetooth Radio Session for Node JESS...');
    const bt = BluetoothService.getInstance();
    await bt.connect('ESP32_JESS', 'ble');
    console.log('  ✓ Node JESS connected.');

    // 3. JESS sends Direct Message to THANU: MSG,PRIVATE,JESS,THANU,Coordinates confirmed for Sector 4
    console.log('\n[3/5] Node "JESS" sending Direct Message to "THANU"...');
    const privateMsg = 'Coordinates confirmed for Sector 4';
    const rawPrivatePacket = `MSG,PRIVATE,JESS,THANU,${privateMsg}`;

    let thanuRxMsg: any = null;
    const unsub = bt.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed && parsed.type === 'CHAT' && parsed.senderId === 'JESS' && parsed.receiverId === 'THANU') {
        thanuRxMsg = parsed;
      }
    });

    bt.handleIncomingChunk(`${rawPrivatePacket}\n`);

    if (!thanuRxMsg) {
      throw new Error('Node THANU failed to receive private direct message from JESS!');
    }

    console.log(`  ✓ Transmitted over Bluetooth/LoRa stream: "${rawPrivatePacket}"`);
    console.log('  ✓ Recipient ID parsed: THANU');
    console.log('  ✓ Sender ID parsed: JESS');
    console.log(`  ✓ Received Text: "${thanuRxMsg.message}"`);

    // 4. Save to SQLite
    console.log('\n[4/5] Saving Private Direct Message to SQLite Database...');
    const clientMsgId = `p_msg_${Date.now()}`;
    await savePrivateMessageLocally(1, 2, 'JESS', thanuRxMsg.message, clientMsgId, true);

    const privateHistory = await getPrivateMessagesLocally();
    const saved = privateHistory.find((m: any) => m.client_msg_id === clientMsgId || m.message === privateMsg);

    if (!saved) {
      throw new Error('Private message was not found in SQLite database after saving!');
    }

    console.log('  ✓ Private message verified in SQLite database:');
    console.log(`     ID: ${saved.id} | From: ${saved.sender_name} | Text: "${saved.message}"`);

    // 5. THANU replies to JESS: MSG,PRIVATE,THANU,JESS,Copy JESS. Moving now.
    console.log('\n[5/5] Node "THANU" replying back to "JESS"...');
    const replyMsg = 'Copy JESS. Moving now.';
    const rawReply = `MSG,PRIVATE,THANU,JESS,${replyMsg}`;

    let jessRxReply: any = null;
    bt.onDataReceived((raw) => {
      const parsed = LoraPacketParser.parse(raw);
      if (parsed && parsed.type === 'CHAT' && parsed.senderId === 'THANU' && parsed.receiverId === 'JESS') {
        jessRxReply = parsed;
      }
    });

    bt.handleIncomingChunk(`${rawReply}\n`);

    if (!jessRxReply) {
      throw new Error('Node JESS failed to receive private reply from THANU!');
    }

    console.log(`  ✓ Node THANU sent direct reply: "${rawReply}"`);
    console.log(`  ✓ Node JESS received direct reply: "${jessRxReply.message}"`);

    unsub();
    await bt.disconnect();

    console.log('\n=================================================================');
    console.log(' 🎉 PRIVATE DIRECT CHAT TEST PASSED 100%!                      ');
    console.log('=================================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ PRIVATE CHAT TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

testPrivateChatJessThanu();
