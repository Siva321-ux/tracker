import { Response } from 'express';
import { dbQuery } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getPublicMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // team_id
    const messages = await dbQuery(
      `SELECT pm.*, u.name as sender_name 
       FROM public_messages pm
       JOIN users u ON pm.sender_id = u.id
       WHERE pm.team_id = ?
       ORDER BY pm.created_at ASC`,
      [id]
    );
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function sendPublicMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // team_id
    const senderId = req.user?.userId;
    const { message, clientMsgId } = req.body;

    if (!message) return res.status(400).json({ success: false, error: 'Message content is required' });

    const result = await dbQuery(
      'INSERT INTO public_messages (team_id, sender_id, message, client_msg_id) VALUES (?, ?, ?, ?)',
      [id, senderId, message, clientMsgId || null]
    );

    res.status(201).json({ success: true, messageId: result[0]?.insertId || result[0]?.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const conversations = await dbQuery(
      `SELECT DISTINCT 
         CASE WHEN pm.sender_id = ? THEN pm.receiver_id ELSE pm.sender_id END as peer_id,
         u.name as peer_name,
         u.email as peer_email,
         u.status as peer_status
       FROM private_messages pm
       JOIN users u ON (u.id = CASE WHEN pm.sender_id = ? THEN pm.receiver_id ELSE pm.sender_id END)
       WHERE pm.sender_id = ? OR pm.receiver_id = ?`,
      [userId, userId, userId, userId]
    );
    res.json({ success: true, conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPrivateMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { userId: peerId } = req.params;

    const messages = await dbQuery(
      `SELECT pm.*, u.name as sender_name 
       FROM private_messages pm
       JOIN users u ON pm.sender_id = u.id
       WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)
       ORDER BY pm.created_at ASC`,
      [userId, peerId, peerId, userId]
    );
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function sendPrivateMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const senderId = req.user?.userId;
    const { receiverId, message, clientMsgId } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ success: false, error: 'receiverId and message are required' });
    }

    const result = await dbQuery(
      'INSERT INTO private_messages (sender_id, receiver_id, message, client_msg_id) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, message, clientMsgId || null]
    );

    // Create notification for receiver
    const sender = await dbQuery('SELECT name FROM users WHERE id = ?', [senderId]);
    const senderName = sender[0]?.name || 'Teammate';

    await dbQuery(
      'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
      [receiverId, 'private_message', `${senderName} sent you a message`, message, senderId]
    );

    res.status(201).json({ success: true, messageId: result[0]?.insertId || result[0]?.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
