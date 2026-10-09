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
    const packetType = parts[0].toUpperCase();

    try {
      if (trimmed.startsWith('MSG,COMMON,')) {
        return LoraPacketParser.parseMsgCommonPacket(parts, trimmed);
      }
      if (trimmed.startsWith('MSG,PRIVATE,')) {
        return LoraPacketParser.parseMsgPrivatePacket(parts, trimmed);
      }

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
          // Raw unformatted text broadcast (e.g. from HC-05 / terminal)
          if (trimmed.length > 0 && !trimmed.includes('{') && !trimmed.startsWith('OK+')) {
            return {
              type: 'PUBLIC',
              senderId: 'Radio Gateway',
              teamId: 'ALL',
              message: trimmed,
              raw: trimmed
            };
          }
          return null;
      }
    } catch (err: any) {
      console.error(`LoraPacketParser error processing "${trimmed}":`, err.message);
      return null;
    }
  }

  private static parseLocPacket(parts: string[], raw: string): ParsedLocPacket | null {
    // Format: LOC,deviceId,lat,lon[,timeOrBattery][,battery]
    if (parts.length < 4) {
      console.warn(`LoraPacketParser: Malformed LOC packet (less than 4 fields): "${raw}"`);
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

    let time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    let value = 100;

    if (parts.length >= 5) {
      const field4 = parts[4].trim();
      if (field4.includes(':')) {
        time = field4;
        if (parts.length >= 6) {
          const val = parseFloat(parts[5]);
          if (!isNaN(val)) value = val;
        }
      } else {
        const val = parseFloat(field4);
        if (!isNaN(val)) value = val;
      }
    }

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

  private static safeBase64Decode(str: string): string {
    if (!str) return str;
    const trimmed = str.trim();
    try {
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (base64Regex.test(trimmed) && trimmed.length % 4 === 0) {
        let decoded = '';
        
        // Exclusively use standard math decoder. React Native global Buffer is notoriously broken.
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        // DO NOT strip padding '=' characters because we need them for accurate decoding!
        const b64 = trimmed.replace(/[^A-Za-z0-9+/=]/g, '');
        let i = 0;
        let rawBytes = '';
        while (i < b64.length) {
            const enc1 = chars.indexOf(b64.charAt(i++));
            const enc2 = chars.indexOf(b64.charAt(i++));
            const enc3 = chars.indexOf(b64.charAt(i++));
            const enc4 = chars.indexOf(b64.charAt(i++));

            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;

            rawBytes += String.fromCharCode(chr1);
            if (enc3 !== 64 && enc3 !== -1) rawBytes += String.fromCharCode(chr2);
            if (enc4 !== 64 && enc4 !== -1) rawBytes += String.fromCharCode(chr3);
          }
          
          try {
            // Reconstruct UTF-16 Javascript string from raw UTF-8 bytes (Fixes emojis)
            decoded = decodeURIComponent(escape(rawBytes));
          } catch (e) {
            decoded = rawBytes;
          }
        
        // Remove the regex check that restricts output to ASCII, allowing emojis to pass
        if (decoded && decoded.trim().length > 0) {
          return decoded;
        }
      }
    } catch (_) {}
    return trimmed;
  }

  private static parseMsgCommonPacket(parts: string[], raw: string): ParsedPublicPacket | null {
    // Format: MSG,COMMON,SENDER_ID,ALL,MESSAGE
    if (parts.length < 5) return null;
    const senderId = parts[2].trim();
    const teamId = parts[3].trim();
    const rawMessage = parts.slice(4).join(',').trim();
    const message = LoraPacketParser.safeBase64Decode(rawMessage);

    if (!senderId || !message) return null;

    return {
      type: 'PUBLIC',
      senderId,
      teamId: teamId || 'ALL',
      message,
      raw
    };
  }

  private static parseMsgPrivatePacket(parts: string[], raw: string): ParsedChatPacket | null {
    // Format: MSG,PRIVATE,SENDER_ID,RECEIVER_ID,MESSAGE
    if (parts.length < 5) return null;
    const senderId = parts[2].trim();
    const receiverId = parts[3].trim();
    const rawMessage = parts.slice(4).join(',').trim();
    const message = LoraPacketParser.safeBase64Decode(rawMessage);

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
