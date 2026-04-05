import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import User from '../models/User.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return null;
};

// Register via Email/Password
router.post('/register', authLimiter, [
  body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
], async (req, res) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const token = generateToken(savedUser._id);
    res.status(201).json({ token, user: { id: savedUser._id, name: savedUser.name, email: savedUser.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login via Email/Password
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google OAuth Login / Registration
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'No Google access token provided' });
    }

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid or expired Google access token' });
    }

    const { email, name, sub: googleId } = await googleRes.json();

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ name, email, googleId });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;