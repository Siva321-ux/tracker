export interface ParsedLocPacket {
  type: 'LOC';
  deviceId: string;
  latitude: number;
  longitude: number;
  time: string;
  value: number;
  raw: string;
}

export interface ParsedChatPacket {
  type: 'CHAT';
  senderId: string;
  receiverId: string;
  message: string;
  raw: string;
}

export interface ParsedPublicPacket {
  type: 'PUBLIC';
  senderId: string;
  teamId: string;
  message: string;
  raw: string;
}

export interface ParsedStatusPacket {
  type: 'STATUS';
  deviceId: string;
  status: string;
  raw: string;
}

export type LoraPacket = ParsedLocPacket | ParsedChatPacket | ParsedPublicPacket | ParsedStatusPacket;

export class LoraPacketParser {
  /**
   * Safely parses raw LoRa string packets.
   * Rejects malformed packets gracefully and logs errors without crashing.
   */
  public static parse(rawPacket: string): LoraPacket | null {
    if (!rawPacket || typeof rawPacket !== 'string') {
      console.warn('LoraPacketParser: Empty or invalid input type');
      return null;
    }

    const trimmed = rawPacket.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(',');
    if (parts.length < 2) {
      console.warn(`LoraPacketParser: Invalid packet format (insufficient fields): "${trimmed}"`);
      return null;
    }

    const packetType = parts[0].toUpperCase();

    try {
      switch (packetType) {
        case 'LOC':
          return LoraPacketParser.parseLocPacket(parts, trimmed);
        case 'CHAT':
          return LoraPacketParser.parseChatPacket(parts, trimmed);
        case 'PUBLIC':
          return LoraPacketParser.parsePublicPacket(parts, trimmed);
        case 'STATUS':
          return LoraPacketParser.parseStatusPacket(parts, trimmed);
        default:
          console.warn(`LoraPacketParser: Unknown packet type "${packetType}" in: "${trimmed}"`);
          return null;
      }
    } catch (err: any) {
      console.error(`LoraPacketParser error processing "${trimmed}":`, err.message);
      return null;
    }
  }

  private static parseLocPacket(parts: string[], raw: string): ParsedLocPacket | null {
    // Format: LOC,dev1,28.6050,77.3700,12:02:00,88
    if (parts.length < 5) {
      console.warn(`LoraPacketParser: Malformed LOC packet (less than 5 fields): "${raw}"`);
      return null;
    }

    const deviceId = parts[1].trim();
    if (!deviceId) {
      console.warn(`LoraPacketParser: Missing device ID in LOC packet: "${raw}"`);
      return null;
    }

    const lat = parseFloat(parts[2]);
    const lon = parseFloat(parts[3]);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      console.warn(`LoraPacketParser: Invalid latitude "${parts[2]}" for device ${deviceId}`);
      return null;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      console.warn(`LoraPacketParser: Invalid longitude "${parts[3]}" for device ${deviceId}`);
      return null;
    }

    const time = parts[4] ? parts[4].trim() : new Date().toTimeString().split(' ')[0];
    const rawVal = parts[5] !== undefined ? parseFloat(parts[5]) : 0;
    const value = isNaN(rawVal) ? 0 : rawVal;

    return {
      type: 'LOC',
      deviceId,
      latitude: lat,
      longitude: lon,
      time,
      value,
      raw
    };
  }

  private static parseChatPacket(parts: string[], raw: string): ParsedChatPacket | null {
    // Format: CHAT,<sender>,<receiver>,<message>
    if (parts.length < 4) {
      console.warn(`LoraPacketParser: Malformed CHAT packet: "${raw}"`);
      return null;
    }

    const senderId = parts[1].trim();
    const receiverId = parts[2].trim();
    const message = parts.slice(3).join(',').trim(); // Handle commas inside message body

    if (!senderId || !receiverId || !message) return null;

    return {
      type: 'CHAT',
      senderId,
      receiverId,
      message,
      raw
    };
  }

  private static parsePublicPacket(parts: string[], raw: string): ParsedPublicPacket | null {
    // Format: PUBLIC,<sender>,<team>,<message>
    if (parts.length < 4) return null;

    const senderId = parts[1].trim();
    const teamId = parts[2].trim();
    const message = parts.slice(3).join(',').trim();

    if (!senderId || !teamId || !message) return null;

    return {
      type: 'PUBLIC',
      senderId,
      teamId,
      message,
      raw
    };
  }

  private static parseStatusPacket(parts: string[], raw: string): ParsedStatusPacket | null {
    // Format: STATUS,<device>,<status>
    if (parts.length < 3) return null;
    const deviceId = parts[1].trim();
    const status = parts[2].trim();

    if (!deviceId || !status) return null;

    return {
      type: 'STATUS',
      deviceId,
      status,
      raw
    };
  }
}
