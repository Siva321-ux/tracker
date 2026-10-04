import { Response } from 'express';
import { dbQuery } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getDevices(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const devices = await dbQuery(
      `SELECT d.*, u.name as user_name 
       FROM devices d
       LEFT JOIN users u ON d.assigned_user_id = u.id`
    );
    res.json({ success: true, devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function registerDevice(req: AuthenticatedRequest, res: Response) {
  try {
    const { deviceCode, deviceName, teamId, assignedUserId } = req.body;
    if (!deviceCode || !deviceName) {
      return res.status(400).json({ success: false, error: 'deviceCode and deviceName are required' });
    }

    const result = await dbQuery(
      'INSERT INTO devices (device_code, device_name, team_id, assigned_user_id, status) VALUES (?, ?, ?, ?, ?)',
      [deviceCode, deviceName, teamId || null, assignedUserId || null, 'online']
    );

    const deviceId = result[0]?.insertId || result[0]?.id;
    res.status(201).json({ success: true, deviceId, message: 'Device registered successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getDeviceById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const devices = await dbQuery('SELECT * FROM devices WHERE id = ?', [id]);
    if (!devices || devices.length === 0) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    res.json({ success: true, device: devices[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
