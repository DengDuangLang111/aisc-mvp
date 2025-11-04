import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendAlert(alert: Alert) {
    this.logger.log(`Alert: [${alert.level}] ${alert.title}`, alert.message);

    // 根据告警级别选择通知渠道
    switch (alert.level) {
      case 'critical':
      case 'error':
        await this.sendToSlack(alert);
        await this.sendEmail(alert);
        break;
      case 'warning':
        await this.sendToSlack(alert);
        break;
      case 'info':
        // 仅记录日志
        break;
    }
  }

  private async sendToSlack(alert: Alert) {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.debug('Slack webhook not configured');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${this.getEmoji(alert.level)} ${alert.title}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${this.getEmoji(alert.level)} ${alert.title}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alert.message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Level:* ${alert.level} | *Time:* ${new Date().toISOString()}`,
                },
              ],
            },
            ...(alert.metadata
              ? [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text:
                        '```' + JSON.stringify(alert.metadata, null, 2) + '```',
                    },
                  },
                ]
              : []),
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      this.logger.log('Alert sent to Slack successfully');
    } catch (error) {
      this.logger.error('Failed to send Slack alert', error);
    }
  }

  private async sendEmail(alert: Alert) {
    // 实现邮件发送逻辑
    // 可以使用 nodemailer 或其他邮件服务
    this.logger.debug('Email notification not implemented');
  }

  private getEmoji(level: string): string {
    const emojis: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return emojis[level] || '📢';
  }

  // 便捷方法
  async info(title: string, message: string, metadata?: Record<string, any>) {
    return this.sendAlert({ level: 'info', title, message, metadata });
  }

  async warning(
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    return this.sendAlert({ level: 'warning', title, message, metadata });
  }

  async error(title: string, message: string, metadata?: Record<string, any>) {
    return this.sendAlert({ level: 'error', title, message, metadata });
  }

  async critical(
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    return this.sendAlert({ level: 'critical', title, message, metadata });
  }
}
