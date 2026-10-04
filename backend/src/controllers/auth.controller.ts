import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbQuery } from '../config/database';
import { generateToken } from '../config/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone, language } = req.body;

    const existing = await dbQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await dbQuery(
      'INSERT INTO users (name, email, phone, password_hash, language) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, passwordHash, language || 'en']
    );

    const userId = result[0]?.insertId || result[0]?.id;
    const token = generateToken({ userId, email });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: userId, name, email, phone, language: language || 'en' }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const users = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken({ userId: user.id, email: user.email });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        language: user.language || 'en',
        status: user.status
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const users = await dbQuery('SELECT id, name, email, phone, language, status, created_at FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: users[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function refreshToken(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const newToken = generateToken({ userId: req.user.userId, email: req.user.email });
    res.json({ success: true, token: newToken });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
