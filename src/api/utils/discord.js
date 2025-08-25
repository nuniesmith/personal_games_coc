import axios from 'axios';
import { logger } from './logger.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordMessage(message, options = {}) {
  if (!WEBHOOK_URL) {
    logger.warn('DISCORD_WEBHOOK_URL not set, skipping Discord notification');
    return { skipped: true };
  }

  const payload = {
    content: typeof message === 'string' ? message : undefined,
    embeds: options.embeds || undefined,
    username: options.username || 'Feast or Famine Bot',
    avatar_url: options.avatarUrl,
  };

  try {
    const res = await axios.post(WEBHOOK_URL, payload);
    return res.data || { ok: true };
  } catch (err) {
    logger.warn('Failed to send Discord message', { error: err.message });
    return { ok: false, error: err.message };
  }
}
