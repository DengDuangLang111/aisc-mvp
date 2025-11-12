import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { getI18nConfig, SupportedLocale } from './i18n.config';

export function detectLocale(req: Request, configService: ConfigService): SupportedLocale {
  const { enabled, defaultLocale } = getI18nConfig(configService);
  if (!enabled) {
    return defaultLocale;
  }

  const header = req.headers['accept-language'];
  if (typeof header === 'string') {
    if (header.includes('zh')) return 'zh-CN';
    if (header.includes('en')) return 'en';
  }

  return defaultLocale;
}
