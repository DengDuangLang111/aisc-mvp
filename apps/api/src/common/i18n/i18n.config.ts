import { ConfigService } from '@nestjs/config';

export const I18N_ENABLED_ENV = 'I18N_ENABLED';

export type SupportedLocale = 'en' | 'zh-CN';

export interface I18nConfig {
  enabled: boolean;
  defaultLocale: SupportedLocale;
}

export function getI18nConfig(configService: ConfigService): I18nConfig {
  const enabled = configService.get<string>(I18N_ENABLED_ENV) === 'true';
  const defaultLocale = (configService.get<string>('I18N_DEFAULT_LOCALE') || 'en') as SupportedLocale;

  return {
    enabled,
    defaultLocale,
  };
}
