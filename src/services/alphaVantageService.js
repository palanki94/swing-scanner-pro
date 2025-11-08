import axios from 'axios';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import moment from 'moment';

export const fetchBars = async (symbol, days = 180) => {
  // Alpha Vantage: Use BSE symbols (e.g., RELIANCE.BSE)
  const avSymbol = symbol.replace('.NS', '.BSE'); // Fallback to BSE if needed
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${avSymbol}&outputsize=full&apikey=${config.alphaVantage.key}`;

  try {
    const res = await axios.get(url);
    console.log(res);
    
    const timeSeries = res.data['Time Series (Daily)'];
    console.log(timeSeries);
    
    if (!timeSeries) {
      logger.warn(`No data for ${symbol}: ${res.data['Note'] || 'Unknown error'}`);
      return null;
    }

    // Parse to bars (reverse chronological → chronological)
    const bars = Object.entries(timeSeries)
      .map(([date, data]) => ({
        date,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'])
      }))
      .sort((a, b) => moment(a.date).diff(moment(b.date)));

    // Limit to last N days
    const cutoff = moment().subtract(days, 'days').format('YYYY-MM-DD');
    return bars.filter(bar => moment(bar.date).isAfter(cutoff));
  } catch (error) {
    logger.error(`Alpha Vantage fetch failed for ${symbol}`, { error: error.message });
    return null;
  }
};
