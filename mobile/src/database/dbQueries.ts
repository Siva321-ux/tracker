import { executeMobileQuery } from './sqlite';

export async function saveLocationLocally(
  deviceCode: string,
  latitude: number,
  longitude: number,
  value: number,
  timestamp: string,
  source: string = 'lora'
): Promise<number> {
  // 1. Ensure device exists in local SQLite
  const devs = await executeMobileQuery('SELECT id FROM devices WHERE device_code = ?', [deviceCode]);
  let deviceId = devs[0]?.id;
  if (!deviceId) {
    const newDev = await executeMobileQuery(
      'INSERT INTO devices (device_code, device_name, status, last_seen, battery_level) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
      [deviceCode, deviceCode, 'online', Math.round(value)]
    );
    deviceId = newDev[0]?.insertId;
  } else {
    await executeMobileQuery(
      'UPDATE devices SET last_seen = CURRENT_TIMESTAMP, status = "online", battery_level = ? WHERE id = ?',
      [Math.round(value), deviceId]
    );
  }

  // 2. Insert into locations
  const result = await executeMobileQuery(
    'INSERT INTO locations (device_id, device_code, latitude, longitude, value, source, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [deviceId, deviceCode, latitude, longitude, value, source, timestamp]
  );
  return result[0]?.insertId;
}

export async function getLatestDeviceLocationsLocally() {
  return await executeMobileQuery(`
    SELECT d.id as device_id, d.device_code, d.device_name, d.status, d.last_seen, d.battery_level,
           l.latitude, l.longitude, l.value, l.timestamp
    FROM devices d
    LEFT JOIN (
      SELECT l1.* FROM locations l1
      INNER JOIN (
        SELECT device_code, MAX(id) as max_id FROM locations GROUP BY device_code
      ) l2 ON l1.id = l2.max_id
    ) l ON d.device_code = l.device_code
  `);
}

export async function queueOfflineItem(
  entityType: 'location' | 'public_message' | 'private_message',
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: any
): Promise<number> {
  const result = await executeMobileQuery(
    'INSERT INTO sync_queue (entity_type, entity_id, operation, payload, status) VALUES (?, ?, ?, ?, ?)',
    [entityType, entityId, operation, JSON.stringify(payload), 'pending']
  );
  return result[0]?.insertId;
}

export async function getPendingSyncQueue() {
  return await executeMobileQuery("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC");
}

export async function markSyncItemCompleted(id: number) {
  return await executeMobileQuery("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [id]);
}

export async function savePublicMessageLocally(
  teamId: number,
  senderId: number,
  senderName: string,
  message: string,
  clientMsgId: string,
  synced: boolean = false
): Promise<number> {
  const result = await executeMobileQuery(
    'INSERT INTO public_messages (team_id, sender_id, sender_name, message, client_msg_id, synced_at) VALUES (?, ?, ?, ?, ?, ?)',
    [teamId, senderId, senderName, message, clientMsgId, synced ? new Date().toISOString() : null]
  );

  if (!synced) {
    await queueOfflineItem('public_message', clientMsgId, 'CREATE', {
      team_id: teamId,
      sender_id: senderId,
      sender_name: senderName,
      message,
      client_msg_id: clientMsgId
    });
  }

  return result[0]?.insertId;
}

export async function savePrivateMessageLocally(
  senderId: number,
  receiverId: number,
  senderName: string,
  message: string,
  clientMsgId: string,
  synced: boolean = false
): Promise<number> {
  const result = await executeMobileQuery(
    'INSERT INTO private_messages (sender_id, receiver_id, sender_name, message, client_msg_id, synced_at) VALUES (?, ?, ?, ?, ?, ?)',
    [senderId, receiverId, senderName, message, clientMsgId, synced ? new Date().toISOString() : null]
  );

  if (!synced) {
    await queueOfflineItem('private_message', clientMsgId, 'CREATE', {
      sender_id: senderId,
      receiver_id: receiverId,
      sender_name: senderName,
      message,
      client_msg_id: clientMsgId
    });
  }

  return result[0]?.insertId;
}

export async function getLocalOfflineRegions() {
  return await executeMobileQuery('SELECT * FROM offline_regions ORDER BY created_at DESC');
}

export async function addLocalOfflineRegion(
  name: string,
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  sizeBytes: number,
  tileCount: number
): Promise<number> {
  const result = await executeMobileQuery(
    'INSERT INTO offline_regions (name, min_latitude, max_latitude, min_longitude, max_longitude, size_bytes, tile_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, minLat, maxLat, minLon, maxLon, sizeBytes, tileCount, 'downloaded']
  );
  return result[0]?.insertId;
}

export async function deleteLocalOfflineRegion(id: number) {
  return await executeMobileQuery('DELETE FROM offline_regions WHERE id = ?', [id]);
}
