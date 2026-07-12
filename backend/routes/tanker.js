import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Tanker from '../models/Tanker.js';
import Village from '../models/Village.js';

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return null;
};

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Tanker.find().populate('village', 'name state district').sort({ dispatchDate: -1 }).skip(skip).limit(limit),
      Tanker.countDocuments()
    ]);
    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update tanker status
router.patch('/:id', [
  body('status').isIn(['Pending', 'Enroute', 'Delivered']).withMessage('Status must be one of: Pending, Enroute, Delivered'),
], async (req, res) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { status } = req.body;
    const tanker = await Tanker.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!tanker) {
      return res.status(404).json({ error: 'Tanker not found' });
    }
    res.json(tanker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new tanker assignment
router.post('/', [
  body('village').isString().notEmpty().withMessage('Village ID is required'),
  body('capacityLiters').isFloat({ gt: 0 }).withMessage('Capacity must be a positive number'),
  body('dispatchDate').isISO8601().toDate().withMessage('Dispatch date must be a valid date'),
], async (req, res) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    // Look up the village to get the name for denormalization
    const village = await Village.findById(req.body.village).select('name');
    if (!village) {
      return res.status(404).json({ error: 'Village not found' });
    }

    const newTanker = new Tanker({
      ...req.body,
      villageName: village.name,
    });
    await newTanker.save();
    res.status(201).json(newTanker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete tanker assignment
router.delete('/:id', async (req, res) => {
  try {
    const tanker = await Tanker.findByIdAndDelete(req.params.id);
    if (!tanker) {
      return res.status(404).json({ error: 'Tanker mission not found' });
    }
    res.json({ message: 'Tanker mission deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

