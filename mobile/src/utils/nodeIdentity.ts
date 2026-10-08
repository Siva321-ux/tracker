import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

let cachedNodeId: string | null = null;

/**
 * Returns the unique Call Sign / Node Identifier for this mobile device.
 * Priority:
 * 1. Logged in / configured User Name from authStore (e.g. 'THANU' or 'JESS')
 * 2. Persisted unique hardware ID (e.g. 'NODE_7A2F')
 * 3. Newly generated unique hardware ID
 */
export async function getLocalNodeIdAsync(): Promise<string> {
  const authUser = useAuthStore.getState().user;
  if (authUser?.name && authUser.name !== 'User' && authUser.name !== 'ESP32 Gateway' && authUser.name !== 'Mobile Node') {
    cachedNodeId = authUser.name.trim();
    return cachedNodeId;
  }

  if (cachedNodeId && cachedNodeId !== 'User' && cachedNodeId !== 'Mobile Node') {
    return cachedNodeId;
  }

  try {
    const stored = await AsyncStorage.getItem('lora_local_node_id');
    if (stored && stored.trim().length > 0) {
      cachedNodeId = stored.trim();
      return cachedNodeId;
    }
  } catch (_) {}

  // Generate a distinct 4-hex callsign: NODE_A1B2
  const randHex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const generatedId = `NODE_${randHex}`;
  cachedNodeId = generatedId;

  try {
    await AsyncStorage.setItem('lora_local_node_id', generatedId);
  } catch (_) {}

  return generatedId;
}

export function getLocalNodeIdSync(): string {
  const authUser = useAuthStore.getState().user;
  if (authUser?.name && authUser.name !== 'User' && authUser.name !== 'ESP32 Gateway' && authUser.name !== 'Mobile Node') {
    return authUser.name.trim();
  }
  if (cachedNodeId) return cachedNodeId;
  return 'NODE_1';
}

export async function setLocalCallSign(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  cachedNodeId = trimmed;
  useAuthStore.getState().updateUserName(trimmed);
  try {
    await AsyncStorage.setItem('lora_local_node_id', trimmed);
  } catch (_) {}
}
