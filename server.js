import express from 'express';
import mongoose from 'mongoose';
import config from './src/config/config.js';
import Alert from './src/models/Alert.js';
import { scanSymbol } from './src/controllers/scannerController.js';


const app = express();
await mongoose.connect(config.mongo.uri);

app.get('/alerts', async (req, res) => {
  const alerts = await Alert.find().sort({ sentAt: -1 }).limit(50);
  res.json(alerts);
});

app.post('/scan/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const result = await scanSymbol(symbol.toUpperCase() + '.NS');
  res.json(result ? { success: true, data: result } : { success: false });
});

app.listen(3000, () => console.log('API running on :3000'));
