import { Response } from 'express';
import { dbQuery } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function saveLocation(req: AuthenticatedRequest, res: Response) {
  try {
    const { deviceId, deviceCode, latitude, longitude, value, timestamp, source } = req.body;
    let targetDeviceId = deviceId;

    if (!targetDeviceId && deviceCode) {
      const devs = await dbQuery('SELECT id FROM devices WHERE device_code = ?', [deviceCode]);
      if (devs && devs.length > 0) {
        targetDeviceId = devs[0].id;
      } else {
        // Auto register dev
        const newDev = await dbQuery(
          'INSERT INTO devices (device_code, device_name, status) VALUES (?, ?, ?)',
          [deviceCode, deviceCode, 'online']
        );
        targetDeviceId = newDev[0]?.insertId || newDev[0]?.id;
      }
    }

    if (!targetDeviceId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'deviceId/deviceCode, latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    await dbQuery(
      'INSERT INTO locations (device_id, latitude, longitude, value, source, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [targetDeviceId, latitude, longitude, value !== undefined ? value : null, source || 'lora', timestamp || new Date().toISOString()]
    );

    // Update last_seen on device
    await dbQuery(
      'UPDATE devices SET last_seen = CURRENT_TIMESTAMP, status = "online" WHERE id = ?',
      [targetDeviceId]
    );

    res.json({ success: true, message: 'Location saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getDeviceLocations(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const locations = await dbQuery(
      'SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT 100',
      [id]
    );
    res.json({ success: true, locations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getLatestTeamLocations(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // team_id
    const locations = await dbQuery(
      `SELECT d.id as device_id, d.device_code, d.device_name, d.status, d.last_seen, u.name as user_name,
              l.latitude, l.longitude, l.value, l.timestamp
       FROM devices d
       LEFT JOIN users u ON d.assigned_user_id = u.id
       LEFT JOIN (
         SELECT l1.* FROM locations l1
         INNER JOIN (
           SELECT device_id, MAX(id) as max_id FROM locations GROUP BY device_id
         ) l2 ON l1.id = l2.max_id
       ) l ON d.id = l.device_id
       WHERE d.team_id = ? OR ? = 0 OR d.team_id IS NULL`,
      [id, id]
    );
    res.json({ success: true, locations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
