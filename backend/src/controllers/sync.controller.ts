import { Response } from 'express';
import { dbQuery } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function processSyncQueue(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { items } = req.body; // Array of sync items queued offline

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, processedCount: 0, syncedItemIds: [] });
    }

    const syncedItemIds: (number | string)[] = [];

    for (const item of items) {
      const { id, entity_type, entity_id, operation, payload } = item;
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

      try {
        if (entity_type === 'location') {
          const { deviceCode, latitude, longitude, value, timestamp, source } = parsedPayload;
          let devs = await dbQuery('SELECT id FROM devices WHERE device_code = ?', [deviceCode]);
          let devId = devs[0]?.id;
          if (!devId && deviceCode) {
            const newDev = await dbQuery(
              'INSERT INTO devices (device_code, device_name, status) VALUES (?, ?, ?)',
              [deviceCode, deviceCode, 'online']
            );
            devId = newDev[0]?.insertId || newDev[0]?.id;
          }

          if (devId && latitude !== undefined && longitude !== undefined) {
            await dbQuery(
              'INSERT INTO locations (device_id, latitude, longitude, value, source, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
              [devId, latitude, longitude, value !== undefined ? value : null, source || 'lora', timestamp || new Date().toISOString()]
            );
            await dbQuery('UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [devId]);
          }
        } else if (entity_type === 'public_message') {
          const { team_id, message, client_msg_id } = parsedPayload;
          // Avoid duplicates by client_msg_id
          const existing = client_msg_id ? await dbQuery('SELECT id FROM public_messages WHERE client_msg_id = ?', [client_msg_id]) : [];
          if (!existing || existing.length === 0) {
            await dbQuery(
              'INSERT INTO public_messages (team_id, sender_id, message, client_msg_id) VALUES (?, ?, ?, ?)',
              [team_id, userId, message, client_msg_id || null]
            );
          }
        } else if (entity_type === 'private_message') {
          const { receiver_id, message, client_msg_id } = parsedPayload;
          const existing = client_msg_id ? await dbQuery('SELECT id FROM private_messages WHERE client_msg_id = ?', [client_msg_id]) : [];
          if (!existing || existing.length === 0) {
            await dbQuery(
              'INSERT INTO private_messages (sender_id, receiver_id, message, client_msg_id) VALUES (?, ?, ?, ?)',
              [userId, receiver_id, message, client_msg_id || null]
            );
          }
        }

        // Record server sync queue log
        await dbQuery(
          'INSERT INTO sync_queue (user_id, entity_type, entity_id, operation, payload, status) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, entity_type, entity_id, operation, JSON.stringify(parsedPayload), 'synced']
        );

        syncedItemIds.push(id);
      } catch (itemErr: any) {
        console.error(`Failed to sync item ${id}:`, itemErr);
      }
    }

    res.json({
      success: true,
      processedCount: syncedItemIds.length,
      syncedItemIds
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
