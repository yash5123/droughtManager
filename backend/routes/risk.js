import express from 'express';
import DroughtRisk from '../models/DroughtRisk.js';
import Village from '../models/Village.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Get latest risk assessments for all villages
    const data = await DroughtRisk.find().populate('village').sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    // In a real system, this would trigger an algorithmic calculation 
    // merging latest rainfall, groundwater, and supply. For now, simply mock logic.
    res.json({ message: 'Triggered async drought calculation job.' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
