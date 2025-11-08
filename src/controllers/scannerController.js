import { fetchBars } from '../services/yahooFinanceService.js';
import {
  calculateVWAP,
  getRSI,
  detectBullFlag,
  detectDoubleBottom
} from '../services/patternService.js';
import { hasUpcomingCatalyst } from '../services/catalystService.js';
import { generateChart } from '../services/chartService.js';
import {
  sendTelegramAlert,
  sendEmailAlert,
  saveAlert
} from '../services/alertService.js';
import logger from '../utils/logger.js';
import fs from 'fs';

const VOLUME_SURGE = 1.6;
const VWAP_TOL = 0.04;
const RSI_MIN = 40, RSI_MAX = 55;

export const scanSymbol = async (symbol) => {
  try {
    // 1. Fetch data
    const bars = await fetchBars(symbol, 180);
    if (!bars || bars.length < 50) {
      logger.debug(`Insufficient data for ${symbol}`);
      return null;
    }

    // 2. Institutional Footprint
    const recent40 = bars.slice(-40);
    const vol20Old = recent40.slice(0, 20).reduce((s, b) => s + b.volume, 0) / 20;
    const vol20New = recent40.slice(-20).reduce((s, b) => s + b.volume, 0) / 20;
    if (vol20New < vol20Old * VOLUME_SURGE) return null;

    const vwap20 = calculateVWAP(bars.slice(-20));
    const latestClose = bars[bars.length - 1].close;
    if (Math.abs(latestClose - vwap20) / vwap20 > VWAP_TOL) return null;

    const rsi = getRSI(bars);
    if (rsi < RSI_MIN || rsi > RSI_MAX) return null;

    // 3. Catalyst Check
    const hasCatalyst = await hasUpcomingCatalyst(symbol);
    if (!hasCatalyst) return null;

    // 4. Pattern Detection
    const patterns = [
      detectBullFlag(bars),
      detectDoubleBottom(bars)
      // Add more: inverse H&S, cup-with-handle, etc.
    ].filter(Boolean);

    if (!patterns.length) return null;

    const pattern = patterns[0];
    const risk = pattern.entry - pattern.stop;
    const reward = pattern.target - pattern.entry;
    const rr = (reward / risk).toFixed(2);

    const result = {
      symbol,
      pattern: pattern.type,
      entry: parseFloat(pattern.entry.toFixed(2)),
      stop: parseFloat(pattern.stop.toFixed(2)),
      target: parseFloat(pattern.target.toFixed(2)),
      rr,
      rsi: parseFloat(rsi.toFixed(1))
    };

    // 5. Generate Chart
    const chartPath = generateChart(bars, pattern, symbol);

    // 6. Send Alerts
    await Promise.all([
      sendTelegramAlert(result, chartPath),
      sendEmailAlert(result, chartPath),
      saveAlert(result, chartPath)
    ]);

    // 7. Cleanup
    fs.unlinkSync(chartPath);

    logger.info(`Alert triggered: ${symbol} - ${pattern.type}`);
    return result;

  } catch (error) {
    logger.error(`Scan failed for ${symbol}`, { error: error.stack });
    return null;
  }
};
