import axios from 'axios';
import moment from 'moment';
import logger from '../utils/logger.js';

/**
 * Checks if a stock has an upcoming catalyst (earnings, block deal, board meeting, etc.)
 * within the next 7 days using NSE India API
 */
export const hasUpcomingCatalyst = async (symbol) => {
  const cleanSymbol = symbol.replace('.NS', '');
  const url = 'https://www.nseindia.com/api/corporate-filings-events';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 8000
    });

    const events = response.data || [];
    const now = moment();
    const future = now.clone().add(7, 'days');

    const hasEvent = events.some(event => {
      const eventSymbol = (event.symbol || '').trim();
      const fromDate = event.fromDate ? moment(event.fromDate, 'DD-MMM-YYYY') : null;

      return (
        eventSymbol === cleanSymbol &&
        fromDate &&
        fromDate.isValid() &&
        fromDate.isBetween(now, future, undefined, '[]')
      );
    });

    return hasEvent;

  } catch (error) {
    logger.warn(`Catalyst check failed for ${symbol}`, { error: error.message });
    return false; // Fail open — don't block scan
  }
};
