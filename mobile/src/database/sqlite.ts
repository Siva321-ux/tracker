import { Platform } from 'react-native';

class WebMobileDatabase {
  private tables: Record<string, any[]> = {};
  private autoIds: Record<string, number> = {};

  constructor() {
    this.tables = {
      users: [],
      teams: [],
      team_members: [],
      devices: [],
      locations: [],
      public_messages: [],
      private_messages: [],
      notifications: [],
      offline_regions: [],
      sync_queue: []
    };
  }

  public run(sql: string, params: any[] = []): { lastID: number; changes: number } {
    const trimmed = sql.trim().toUpperCase();
    
    if (trimmed.startsWith('INSERT INTO DEVICES')) {
      const devCode = params[0];
      const devName = params[1];
      const status = params[2] || 'online';
      const battery = params[3] !== undefined ? params[3] : 85;
      
      let id = ++this.autoIds['devices'] || (this.autoIds['devices'] = 1);
      const existing = this.tables.devices.find((d: any) => d.device_code === devCode);
      if (existing) {
        existing.status = status;
        existing.battery_level = battery;
        existing.last_seen = new Date().toISOString();
        return { lastID: existing.id, changes: 1 };
      }
      const record = { id, device_code: devCode, device_name: devName, status, battery_level: battery, last_seen: new Date().toISOString() };
      this.tables.devices.push(record);
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('UPDATE DEVICES')) {
      const battery = params[0];
      const devId = params[1];
      const dev = this.tables.devices.find((d: any) => d.id === devId);
      if (dev) {
        dev.battery_level = battery;
        dev.status = 'online';
        dev.last_seen = new Date().toISOString();
      }
      return { lastID: devId, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO LOCATIONS')) {
      const deviceId = params[0];
      const deviceCode = params[1];
      const lat = params[2];
      const lon = params[3];
      const val = params[4];
      const source = params[5];
      const time = params[6];
      let id = ++this.autoIds['locations'] || (this.autoIds['locations'] = 1);
      const record = { id, device_id: deviceId, device_code: deviceCode, latitude: lat, longitude: lon, value: val, source, timestamp: time };
      this.tables.locations.push(record);
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO PUBLIC_MESSAGES')) {
      let id = ++this.autoIds['public_messages'] || (this.autoIds['public_messages'] = 1);
      const record = { id, team_id: params[0], sender_id: params[1], sender_name: params[2], message: params[3], client_msg_id: params[4], synced_at: params[5] };
      this.tables.public_messages.push(record);
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO PRIVATE_MESSAGES')) {
      let id = ++this.autoIds['private_messages'] || (this.autoIds['private_messages'] = 1);
      const record = { id, sender_id: params[0], receiver_id: params[1], sender_name: params[2], message: params[3], client_msg_id: params[4], synced_at: params[5] };
      this.tables.private_messages.push(record);
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO SYNC_QUEUE')) {
      let id = ++this.autoIds['sync_queue'] || (this.autoIds['sync_queue'] = 1);
      const record = { id, entity_type: params[0], entity_id: params[1], operation: params[2], payload: params[3], status: params[4] };
      this.tables.sync_queue.push(record);
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO OFFLINE_REGIONS')) {
      let id = ++this.autoIds['offline_regions'] || (this.autoIds['offline_regions'] = 1);
      const record = { id, name: params[0], min_latitude: params[1], max_latitude: params[2], min_longitude: params[3], max_longitude: params[4], size_bytes: params[5], tile_count: params[6], status: params[7], created_at: new Date().toISOString() };
      this.tables.offline_regions.push(record);
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('UPDATE SYNC_QUEUE')) {
      const id = params[0];
      const item = this.tables.sync_queue.find((q: any) => q.id === id);
      if (item) item.status = 'synced';
      return { lastID: id, changes: 1 };
    }

    if (trimmed.startsWith('DELETE FROM OFFLINE_REGIONS')) {
      const id = params[0];
      this.tables.offline_regions = this.tables.offline_regions.filter((r: any) => r.id !== id);
      return { lastID: id, changes: 1 };
    }

    return { lastID: 1, changes: 1 };
  }

  public query(sql: string, params: any[] = []): any[] {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.includes('FROM DEVICES WHERE DEVICE_CODE')) {
      const devCode = params[0];
      return this.tables.devices.filter((d: any) => d.device_code === devCode);
    }

    if (trimmed.includes('FROM DEVICES') && trimmed.includes('JOIN')) {
      return this.tables.devices.map((d: any) => {
        const latestLoc = [...this.tables.locations].reverse().find((l: any) => l.device_code === d.device_code);
        return {
          device_id: d.id,
          device_code: d.device_code,
          device_name: d.device_name,
          status: d.status,
          last_seen: d.last_seen,
          battery_level: d.battery_level,
          latitude: latestLoc ? latestLoc.latitude : 11.5034,
          longitude: latestLoc ? latestLoc.longitude : 77.2444,
          value: latestLoc ? latestLoc.value : d.battery_level,
          timestamp: latestLoc ? latestLoc.timestamp : '12:00:00'
        };
      });
    }

    if (trimmed.includes('FROM SYNC_QUEUE WHERE STATUS = \'PENDING\'')) {
      return this.tables.sync_queue.filter((q: any) => q.status === 'pending');
    }

    if (trimmed.includes('FROM OFFLINE_REGIONS')) {
      return this.tables.offline_regions;
    }

    if (trimmed.includes('FROM LOCATIONS WHERE DEVICE_ID')) {
      const devId = params[0];
      return this.tables.locations.filter((l: any) => l.device_id === devId);
    }

    return [];
  }
}

const clientDb = new WebMobileDatabase();

export async function initMobileDatabase(): Promise<void> {
  console.log('[SQLite] Mobile local SQLite database initialized.');
}

export function executeMobileQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE')) {
    const res = clientDb.run(sql, params);
    return Promise.resolve([{ insertId: res.lastID, affectedRows: res.changes }] as any);
  } else {
    const rows = clientDb.query(sql, params);
    return Promise.resolve(rows as T[]);
  }
}
