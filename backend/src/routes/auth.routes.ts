import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/index.js';
import { findUserByEmail, findUserByPhone, findUserByEmailOrPhone, findUserById, createUser } from '../database/db.js';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email address, and password are required' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedPhone = phone ? String(phone).trim() : undefined;

    const existingEmail = findUserByEmail(trimmedEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    if (trimmedPhone) {
      const existingPhone = findUserByPhone(trimmedPhone);
      if (existingPhone) {
        return res.status(400).json({ error: 'An account with this phone number already exists' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = `usr_${Date.now()}`;

    const user = createUser({
      id,
      name: String(name).trim(),
      email: trimmedEmail,
      phone: trimmedPhone,
      password_hash
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, CONFIG.JWT_SECRET, { expiresIn: '14d' });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

authRouter.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = String(identifier || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email ID or Phone Number and Password are required' });
    }

    const user = findUserByEmailOrPhone(loginIdentifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User account not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, CONFIG.JWT_SECRET, { expiresIn: '14d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

authRouter.get('/me', (req: Request, res: Response): any => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { userId: string };
    const user = findUserById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User profile not found' });
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
