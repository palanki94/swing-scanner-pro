import { RSI } from 'technicalindicators';

export const calculateVWAP = (bars) => {
  let totalPV = 0, totalV = 0;
  for (const b of bars) {
    const tp = (b.high + b.low + b.close) / 3;
    totalPV += tp * b.volume;
    totalV += b.volume;
  }
  return totalPV / totalV;
};

export const getRSI = (bars, period = 14) => {
  const closes = bars.map(b => b.close);
  const rsi = RSI.calculate({ values: closes, period });
  return rsi[rsi.length - 1];
};

export const detectBullFlag = (bars) => {
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  let poleTop = -1;

  for (let i = bars.length - 40; i < bars.length - 10; i++) {
    if (highs[i] === Math.max(...highs.slice(i-20, i+1))) {
      poleTop = i; break;
    }
  }
  if (poleTop === -1) return null;

  const flagStart = poleTop + 5;
  const flagBars = bars.slice(flagStart, flagStart + 15);
  if (flagBars.length < 10) return null;

  const flagHigh = Math.max(...flagBars.map(b => b.high));
  const flagLow = Math.min(...flagBars.map(b => b.low));
  if ((flagHigh - flagLow) / flagLow > 0.06) return null;

  const breakout = bars[bars.length - 1].close > flagHigh;
  if (!breakout) return null;

  return { type: 'Bull Flag', entry: flagHigh, stop: flagLow, target: flagHigh + (flagHigh - lows[poleTop]) };
};

export const detectDoubleBottom = (bars) => {
  const lows = bars.map(b => b.low);
  const lowsIdx = lows.map((v, i) => ({ v, i }))
    .filter((_, i) => i >= bars.length * 0.6)
    .sort((a, b) => a.v - b.v);

  if (lowsIdx.length < 2) return null;
  const [b1, b2] = lowsIdx;
  if (Math.abs(b1.v - b2.v) / b1.v > 0.03) return null;
  if (b2.i - b1.i < 10 || b2.i - b1.i > 60) return null;

  const neckline = Math.max(...bars.slice(b1.i, b2.i).map(b => b.high));
  if (bars[bars.length - 1].close <= neckline * 1.01) return null;

  return {
    type: 'Double Bottom',
    entry: neckline,
    stop: Math.min(b1.v, b2.v),
    target: neckline + (neckline - Math.min(b1.v, b2.v))
  };
};
