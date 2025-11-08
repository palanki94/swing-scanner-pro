import { RSI } from 'technicalindicators';
import moment from 'moment';

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

// ——— 1. BULL FLAG (Already had) ———
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

// ——— 2. DOUBLE BOTTOM (Already had) ———
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

// ——— 3. CUP WITH HANDLE ———
export const detectCupWithHandle = (bars) => {
  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);

  // Find cup bottom (lowest point in last 100 days)
  let cupBottomIdx = -1;
  let minLow = Infinity;
  for (let i = bars.length - 100; i < bars.length - 30; i++) {
    if (lows[i] < minLow) {
      minLow = lows[i];
      cupBottomIdx = i;
    }
  }
  if (cupBottomIdx === -1) return null;

  // Cup left & right rims (should be ~same level)
  const leftRimHigh = Math.max(...highs.slice(cupBottomIdx - 30, cupBottomIdx));
  const rightRimHigh = Math.max(...highs.slice(cupBottomIdx + 10, cupBottomIdx + 40));
  if (Math.abs(leftRimHigh - rightRimHigh) / leftRimHigh > 0.1) return null;

  // Handle: shallow pullback after right rim
  const handleBars = bars.slice(cupBottomIdx + 40, cupBottomIdx + 60);
  if (handleBars.length < 10) return null;
  const handleLow = Math.min(...handleBars.map(b => b.low));
  const handleHigh = Math.max(...handleBars.map(b => b.high));
  if ((handleHigh - handleLow) / handleLow > 0.08) return null; // Handle too deep

  const breakout = closes[closes.length - 1] > rightRimHigh;
  if (!breakout) return null;

  const cupDepth = leftRimHigh - minLow;
  return {
    type: 'Cup with Handle',
    entry: rightRimHigh,
    stop: handleLow,
    target: rightRimHigh + cupDepth
  };
};

// ——— 4. INVERSE HEAD & SHOULDERS ———
export const detectInverseHS = (bars) => {
  const lows = bars.map(b => b.low);
  const highs = bars.map(b => b.high);

  // Find 3 lows: left shoulder, head, right shoulder
  const candidates = lows.map((v, i) => ({ v, i }))
    .filter((_, i) => i >= bars.length * 0.5)
    .sort((a, b) => a.v - b.v);

  if (candidates.length < 3) return null;
  const [head, leftShoulder, rightShoulder] = candidates; // head = lowest

  if (leftShoulder.i > head.i || rightShoulder.i < head.i) return null;
  if (rightShoulder.i - head.i < 5 || head.i - leftShoulder.i < 5) return null;

  const necklineLeft = Math.max(...highs.slice(leftShoulder.i, head.i));
  const necklineRight = Math.max(...highs.slice(head.i, rightShoulder.i));
  const neckline = Math.min(necklineLeft, necklineRight);

  const breakout = bars[bars.length - 1].close > neckline * 1.01;
  if (!breakout) return null;

  const patternHeight = neckline - head.v;
  return {
    type: 'Inverse H&S',
    entry: neckline,
    stop: head.v,
    target: neckline + patternHeight
  };
};

// ——— 5. ASCENDING TRIANGLE ———
export const detectAscendingTriangle = (bars) => {
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);

  // Flat resistance (last 30 highs within 3%)
  const recentHighs = highs.slice(-30);
  const maxH = Math.max(...recentHighs);
  const minH = Math.min(...recentHighs);
  if ((maxH - minH) / maxH > 0.03) return null;

  // Rising support (at least 3 higher lows)
  let supportPoints = [];
  for (let i = bars.length - 40; i < bars.length - 5; i++) {
    if (lows[i] === Math.min(...lows.slice(i-5, i+6))) {
      supportPoints.push({ idx: i, low: lows[i] });
    }
  }
  if (supportPoints.length < 3) return null;

  // Check rising trend
  for (let i = 1; i < supportPoints.length; i++) {
    if (supportPoints[i].low <= supportPoints[i-1].low) return null;
  }

  const resistance = maxH;
  const breakout = bars[bars.length - 1].close > resistance;
  if (!breakout) return null;

  const triangleHeight = resistance - supportPoints[supportPoints.length - 1].low;
  return {
    type: 'Ascending Triangle',
    entry: resistance,
    stop: supportPoints[supportPoints.length - 1].low,
    target: resistance + triangleHeight
  };
};

// ——— 6. BULL PENNANT ———
export const detectBullPennant = (bars) => {
  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);

  // Find pole: strong upward move (20%+ in 10-20 bars)
  let poleStart = -1;
  for (let i = bars.length - 50; i < bars.length - 20; i++) {
    const gain = closes[i+10] / closes[i] - 1;
    if (gain > 0.20) {
      poleStart = i; break;
    }
  }
  if (poleStart === -1) return null;

  // Pennant: tight consolidation after pole
  const pennantBars = bars.slice(poleStart + 10, poleStart + 30);
  if (pennantBars.length < 12) return null;

  const pennantHigh = Math.max(...pennantBars.map(b => b.high));
  const pennantLow = Math.min(...pennantBars.map(b => b.low));
  if ((pennantHigh - pennantLow) / pennantLow > 0.1) return null;

  const breakout = closes[closes.length - 1] > pennantHigh;
  if (!breakout) return null;

  const poleHeight = highs[poleStart + 10] - lows[poleStart];
  return {
    type: 'Bull Pennant',
    entry: pennantHigh,
    stop: pennantLow,
    target: pennantHigh + poleHeight
  };
};
