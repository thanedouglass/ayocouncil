import { verifyChannelAdmin, verifyWebhookSecret, parseAdminIds } from './adminGate';
import { formatCouncilBroadcastHtml } from './messageFormatter';
import { TelegramBroadcastPayload, TelegramConfig, TelegramSendResult } from './types';

/**
 * Lightweight, zero-dependency Telegram Bot Client for the y3K Channel.
 * Guarantees zero-retention, fail-safe non-blocking execution, and robust HTML dispatch.
 */
export class TelegramService {
  private config: TelegramConfig;
  private hasLoggedUnconfigured: boolean = false;

  constructor(customConfig?: Partial<TelegramConfig>) {
    const rawBotToken = customConfig?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
    const rawChannelId = customConfig?.channelId ?? process.env.TELEGRAM_Y3K_CHANNEL_ID;
    const rawWebhookSecret = customConfig?.webhookSecret ?? process.env.TELEGRAM_WEBHOOK_SECRET;

    // Filter placeholder strings
    const botToken =
      rawBotToken && !rawBotToken.includes('your_telegram_bot_token_here') ? rawBotToken.trim() : undefined;
    const channelId =
      rawChannelId && !rawChannelId.includes('your_target_channel_id_here') ? rawChannelId.trim() : undefined;
    const webhookSecret =
      rawWebhookSecret && !rawWebhookSecret.includes('your_secure_webhook_secret_here')
        ? rawWebhookSecret.trim()
        : undefined;

    const adminIds = customConfig?.adminIds ?? Array.from(parseAdminIds(process.env.TELEGRAM_ADMIN_IDS));

    this.config = {
      botToken,
      channelId,
      adminIds,
      webhookSecret
    };
  }

  /**
   * Returns true if bot token and target channel ID are configured.
   */
  public isConfigured(): boolean {
    return Boolean(this.config.botToken && this.config.channelId);
  }

  /**
   * Returns configuration status for health checks.
   */
  public getStatus(): {
    configured: boolean;
    channelId: string | null;
    adminCount: number;
    hasWebhookSecret: boolean;
  } {
    return {
      configured: this.isConfigured(),
      channelId: this.config.channelId || null,
      adminCount: this.config.adminIds.length,
      hasWebhookSecret: Boolean(this.config.webhookSecret)
    };
  }

  /**
   * Verifies if a Telegram user is authorized to perform administrative actions.
   */
  public verifyAdmin(userId: string | number | undefined | null): boolean {
    return verifyChannelAdmin(userId, this.config.adminIds);
  }

  /**
   * Verifies an incoming webhook secret token.
   */
  public verifyWebhook(providedSecret: string | undefined | null): boolean {
    return verifyWebhookSecret(providedSecret, this.config.webhookSecret);
  }

  /**
   * Sends a message to a specific Telegram chat or channel via HTTP POST.
   * NEVER throws or crashes the calling process.
   */
  public async sendMessage(
    chatId: string | number,
    text: string,
    options: {
      parseMode?: 'HTML' | 'MarkdownV2';
      disableWebPagePreview?: boolean;
    } = {}
  ): Promise<TelegramSendResult> {
    const timestamp = new Date().toISOString();

    // 1. Dry-run / Local simulation if unconfigured
    if (!this.config.botToken) {
      if (!this.hasLoggedUnconfigured) {
        console.log(
          '[TelegramService] TELEGRAM_BOT_TOKEN not configured. Operating in simulated dry-run mode.'
        );
        this.hasLoggedUnconfigured = true;
      }
      return {
        success: true,
        simulated: true,
        messageId: Math.floor(Math.random() * 100000),
        timestamp
      };
    }

    const parseMode = options.parseMode || 'HTML';
    const disableWebPagePreview = options.disableWebPagePreview ?? true;

    try {
      const endpoint = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const body = {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData: any = await response.json();

      if (!response.ok || !responseData.ok) {
        const errorDesc = responseData?.description || response.statusText || 'Unknown Telegram API Error';
        console.warn(
          `[TelegramService] Telegram API error (${response.status}): ${errorDesc} (chat: ${chatId})`
        );
        return {
          success: false,
          error: errorDesc,
          timestamp
        };
      }

      return {
        success: true,
        messageId: responseData.result?.message_id,
        timestamp
      };
    } catch (err: any) {
      // Catch network timeouts, DNS errors, or socket resets safely
      const errorMsg = err?.name === 'AbortError' ? 'Telegram API request timed out (8s limit)' : err?.message || String(err);
      console.warn(`[TelegramService] Non-fatal dispatch error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        timestamp
      };
    }
  }

  /**
   * Broadcasts a structured council deliberation & Elegba counter-perspective
   * directly to the designated y3K Telegram channel.
   *
   * @param payload Full deliberation context and cryptographic hash receipt
   */
  public async broadcastCouncilDeliberation(
    payload: TelegramBroadcastPayload
  ): Promise<TelegramSendResult> {
    const targetChannel = this.config.channelId || '@y3K_channel';
    const htmlMessage = formatCouncilBroadcastHtml(payload);

    console.log(
      `[TelegramService] Dispatching consensus broadcast to y3K channel (${targetChannel})...`
    );

    return this.sendMessage(targetChannel, htmlMessage, {
      parseMode: 'HTML',
      disableWebPagePreview: true
    });
  }
}

// Export singleton instance for app-wide use
export const telegramService = new TelegramService();
