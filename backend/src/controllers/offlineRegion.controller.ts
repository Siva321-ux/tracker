import { Response } from 'express';
import { dbQuery } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getOfflineRegions(req: AuthenticatedRequest, res: Response) {
  try {
    const regions = await dbQuery('SELECT * FROM offline_regions ORDER BY created_at DESC');
    res.json({ success: true, regions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createOfflineRegion(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { name, minLatitude, maxLatitude, minLongitude, maxLongitude } = req.body;

    if (!name || minLatitude === undefined || maxLatitude === undefined || minLongitude === undefined || maxLongitude === undefined) {
      return res.status(400).json({ success: false, error: 'All region parameters are required' });
    }

    const result = await dbQuery(
      'INSERT INTO offline_regions (name, min_latitude, max_latitude, min_longitude, max_longitude, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, minLatitude, maxLatitude, minLongitude, maxLongitude, userId]
    );

    res.status(201).json({ success: true, regionId: result[0]?.insertId || result[0]?.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
