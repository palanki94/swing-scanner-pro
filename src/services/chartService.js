import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const CHART_DIR = path.resolve('charts');
if (!fs.existsSync(CHART_DIR)) fs.mkdirSync(CHART_DIR);

export const generateChart = (bars, pattern, symbol) => {
  const width = 1000, height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  const prices = bars.flatMap(b => [b.high, b.low]);
  const maxP = Math.max(...prices) * 1.1;
  const minP = Math.min(...prices) * 0.9;
  const range = maxP - minP;
  const chartHeight = height * 0.8;
  const chartTop = height * 0.1;
  const barWidth = width / bars.length * 0.7;
  const gap = width / bars.length * 0.3;

  bars.forEach((bar, i) => {
    const x = i * (barWidth + gap) + gap / 2;
    const yOpen = chartTop + (maxP - bar.open) / range * chartHeight;
    const yClose = chartTop + (maxP - bar.close) / range * chartHeight;
    const yHigh = chartTop + (maxP - bar.high) / range * chartHeight;
    const yLow = chartTop + (maxP - bar.low) / range * chartHeight;

    const isGreen = bar.close >= bar.open;
    ctx.strokeStyle = isGreen ? '#26a69a' : '#ef5350';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + barWidth / 2, yHigh);
    ctx.lineTo(x + barWidth / 2, yLow);
    ctx.stroke();

    ctx.fillStyle = isGreen ? '#26a69a' : '#ef5350';
    ctx.fillRect(x, Math.min(yOpen, yClose), barWidth, Math.abs(yClose - yOpen));
  });

  const drawLine = (price, color, label) => {
    const y = chartTop + (maxP - price) / range * chartHeight;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '16px Arial';
    ctx.fillText(`${label}: ₹${price.toFixed(1)}`, width - 160, y - 5);
  };

  drawLine(pattern.entry, '#00ff00', 'Entry');
  drawLine(pattern.stop, '#ff0000', 'Stop');
  drawLine(pattern.target, '#0099ff', 'Target');

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`${symbol} - ${pattern.type}`, 20, 40);

  const filePath = path.join(CHART_DIR, `${symbol}_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer());
  return filePath;
};
