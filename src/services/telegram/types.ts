import { ChairmanDossier } from '../../types/council';
import { ChainAnchorReceipt } from '../../ledger/chainAnchor';

/**
 * Configuration for Telegram Y3K channel integration.
 */
export interface TelegramConfig {
  botToken?: string;
  channelId?: string;
  adminIds: string[];
  webhookSecret?: string;
}

/**
 * Result of attempting to send a Telegram message.
 */
export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  simulated?: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Payload structure for broadcasting a full deliberation to the Y3K channel.
 */
export interface TelegramBroadcastPayload {
  inquiry: string;
  dossier: ChairmanDossier;
  elegbaPushback?: string;
  auditReceipt?: Partial<ChainAnchorReceipt> | {
    txHash?: string;
    contractAddress?: string;
    eip712Digest?: string;
    targetChain?: string;
    timestamp?: number;
  };
  customNote?: string;
}

/**
 * Lightweight Telegram Webhook Update payload.
 */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
}
