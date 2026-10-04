import { Response } from 'express';
import { dbQuery } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getTeams(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const teams = await dbQuery(
      `SELECT t.*, tm.role 
       FROM teams t 
       JOIN team_members tm ON t.id = tm.team_id 
       WHERE tm.user_id = ?`,
      [userId]
    );
    res.json({ success: true, teams });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Team name is required' });

    const result = await dbQuery(
      'INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || '', userId]
    );

    const teamId = result[0]?.insertId || result[0]?.id;

    // Auto add creator as admin
    await dbQuery(
      'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
      [teamId, userId, 'admin']
    );

    res.status(201).json({ success: true, teamId, message: 'Team created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getTeamDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const teams = await dbQuery('SELECT * FROM teams WHERE id = ?', [id]);
    if (!teams || teams.length === 0) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    const members = await dbQuery(
      `SELECT u.id, u.name, u.email, u.phone, u.status, tm.role, tm.joined_at, d.device_code
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN devices d ON d.assigned_user_id = u.id
       WHERE tm.team_id = ?`,
      [id]
    );

    res.json({ success: true, team: teams[0], members });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function addTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    await dbQuery(
      'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
      [id, userId, role || 'member']
    );

    res.json({ success: true, message: 'Member added to team successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
