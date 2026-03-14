import express from 'express';
import Tanker from '../models/Tanker.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Tanker.find().populate('village').sort({ dispatchDate: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update tanker status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const tanker = await Tanker.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(tanker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new tanker assignment
router.post('/', async (req, res) => {
  try {
    const newTanker = new Tanker(req.body);
    await newTanker.save();
    res.status(201).json(newTanker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
