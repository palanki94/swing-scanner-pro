import YahooFinance from 'yahoo-finance2';
import logger from '../utils/logger.js';
import moment from 'moment';

// Instantiate once (required in v3+)
const yahooFinance = new YahooFinance();

export const fetchBars = async (symbol, days = 180) => {
  const period1 = moment().subtract(days, 'days').toDate();  // Start date
  const period2 = moment().toDate();                         // End date

  try {
    // CORRECT OPTIONS per v3.10.1
    const result = await yahooFinance.historical(symbol, {
      period1,   // ← Use period1 (Date object)
      period2,   // ← Use period2 (Date object)
      interval: '1d'
    });
    

    if (!result || result.length === 0) {
      logger.warn(`No data for ${symbol} (possibly delisted)`);
      return null;
    }

    // Return in chronological order
    return result.map(day => ({
      date: moment(day.date).format('YYYY-MM-DD'),
      open: day.open || 0,
      high: day.high || 0,
      low: day.low || 0,
      close: day.close || 0,
      volume: day.volume || 0
    }));
  } catch (error) {
    logger.error(`yfinance failed for ${symbol}`, { error: error.message });
    return null;
  }
};
