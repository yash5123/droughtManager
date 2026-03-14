import express from 'express';
import Village from '../models/Village.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const villages = await Village.find();
    // Simulate supply analysis
    const analysis = villages.map(v => {
      // average 135 liters per capita per day standard demand
      const demandLitersDay = v.population * 135; 
      // mocking supply values for demonstration
      const currentSupplyLiters = demandLitersDay * (0.5 + Math.random()); 
      const deficit = demandLitersDay - currentSupplyLiters;
      return {
        village: v,
        demand: demandLitersDay,
        supply: currentSupplyLiters,
        deficit: deficit > 0 ? deficit : 0,
        status: deficit > 0 ? 'Shortage' : 'Sufficient'
      };
    });
    
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
