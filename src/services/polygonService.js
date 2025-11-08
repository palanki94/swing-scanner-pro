import axios from 'axios';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import moment from 'moment';

export const fetchBars = async (symbol, days = 180) => {
  const to = moment().format('YYYY-MM-DD');
  const from = moment().subtract(days, 'days').format('YYYY-MM-DD');
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${config.polygon.key}`;

  try {
    const res = await axios.get(url);
    return res.data.results.map(r => ({
      date: moment(r.t).format('YYYY-MM-DD'),
      open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v
    }));
  } catch (error) {
    logger.error(`Polygon fetch failed for ${symbol}`, { error: error.message });
    return null;
  }
};
