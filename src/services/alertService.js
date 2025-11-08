import { Telegraf } from 'telegraf';
import nodemailer from 'nodemailer';
import config from '../config/config.js';
import Alert from '../models/Alert.js';
import logger from '../utils/logger.js';

const bot = new Telegraf(config.telegram.token);
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.pass }
});

export const sendTelegramAlert = async (result, chartPath) => {
  const caption = `
*SWING ALERT*  
*${result.symbol}*  
Pattern: ${result.pattern}  
Entry: ₹${result.entry.toFixed(2)}  
Stop: ₹${result.stop.toFixed(2)}  
Target: ₹${result.target.toFixed(2)}  
R:R = 1:${result.rr}  
RSI: ${result.rsi.toFixed(1)}
  `.trim();

  await bot.telegram.sendPhoto(
    config.telegram.chatId,
    { source: chartPath },
    { caption, parse_mode: 'Markdown' }
  );
};

export const sendEmailAlert = async (result, chartPath) => {
  const html = `
    <h2>SWING ALERT: ${result.symbol}</h2>
    <p><strong>Pattern:</strong> ${result.pattern}</p>
    <p><strong>Entry:</strong> ₹${result.entry.toFixed(2)}</p>
    <p><strong>Stop:</strong> ₹${result.stop.toFixed(2)}</p>
    <p><strong>Target:</strong> ₹${result.target.toFixed(2)}</p>
    <p><strong>R:R:</strong> 1:${result.rr}</p>
    <p><strong>RSI:</strong> ${result.rsi.toFixed(1)}</p>
  `;

  await transporter.sendMail({
    from: `"Swing Scanner" <${config.email.user}>`,
    to: config.email.to,
    subject: `SWING: ${result.symbol} - ${result.pattern}`,
    html,
    attachments: [{ path: chartPath }]
  });
};

export const saveAlert = async (result, chartPath) => {
  const alert = new Alert({
    ...result,
    chartPath
  });
  await alert.save();
  logger.info(`Alert saved: ${result.symbol}`);
};
