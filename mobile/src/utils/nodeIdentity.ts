import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';

let cachedNodeId: string | null = null;

/**
 * Returns the unique Call Sign / Node Identifier for this mobile device.
 * Priority:
 * 1. Logged in / configured User Name from authStore (e.g. 'THANU' or 'JESS')
 * 2. Persisted unique hardware ID (e.g. 'NODE_7A2F')
 * 3. Default 'Mobile Node'
 */
export async function getLocalNodeIdAsync(): Promise<string> {
  const authUser = useAuthStore.getState().user;
  if (authUser?.name && authUser.name !== 'User' && authUser.name !== 'ESP32 Gateway') {
    cachedNodeId = authUser.name.trim();
    useDeviceStore.getState().setLocalNodeName(cachedNodeId);
    return cachedNodeId;
  }

  if (cachedNodeId && cachedNodeId !== 'User') {
    return cachedNodeId;
  }

  try {
    const stored = await AsyncStorage.getItem('lora_local_node_id');
    if (stored && stored.trim().length > 0) {
      cachedNodeId = stored.trim();
      useDeviceStore.getState().setLocalNodeName(cachedNodeId);
      return cachedNodeId;
    }
  } catch (_) {}

  cachedNodeId = 'Mobile Node';
  useDeviceStore.getState().setLocalNodeName('Mobile Node');
  return 'Mobile Node';
}

export function getLocalNodeIdSync(): string {
  const authUser = useAuthStore.getState().user;
  if (authUser?.name && authUser.name !== 'User' && authUser.name !== 'ESP32 Gateway') {
    return authUser.name.trim();
  }
  if (cachedNodeId) return cachedNodeId;
  return 'Mobile Node';
}

export async function setLocalCallSign(name: string): Promise<void> {
  const trimmed = name.trim() || 'Mobile Node';
  cachedNodeId = trimmed;
  useAuthStore.getState().updateUserName(trimmed);
  useDeviceStore.getState().setLocalNodeName(trimmed);
  try {
    await AsyncStorage.setItem('lora_local_node_id', trimmed);
  } catch (_) {}
}
