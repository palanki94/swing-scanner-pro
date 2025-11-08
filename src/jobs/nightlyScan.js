import mongoose from 'mongoose';
import config from '../config/config.js';
import { scanSymbol } from '../controllers/scannerController.js';
import logger from '../utils/logger.js';
import fs from 'fs';

const STOCKS = JSON.parse(fs.readFileSync('data/nifty_stocks.json', 'utf8'));

const main = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info('MongoDB connected');

    logger.info(`Starting nightly scan on ${STOCKS.length} stocks`);

    let triggered = 0;
    for (const symbol of STOCKS) {
        const result = await scanSymbol(symbol);
        if (result) triggered++;
        await new Promise(r => setTimeout(r, 12000));  // 12s delay
    }

    logger.info(`Scan complete. ${triggered} alerts sent.`);
  } catch (error) {
    logger.error('Nightly scan failed', { error: error.message });
  } finally {
    process.exit();
  }
};

main();
