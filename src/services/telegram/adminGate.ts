/**
 * Admin verification gate for the Telegram y3K channel integration.
 * Ensures only authorized Telegram numeric user IDs can execute administrative
 * commands, manual broadcast triggers, or system toggles.
 */

/**
 * Parses a comma-separated string of Telegram user IDs into a sanitized set of strings.
 */
export function parseAdminIds(rawAdminIds?: string): Set<string> {
  const adminIds = new Set<string>();
  if (!rawAdminIds) return adminIds;

  const tokens = rawAdminIds.split(',');
  for (const token of tokens) {
    const trimmed = token.trim();
    if (trimmed && !trimmed.startsWith('admin_user_id_')) {
      adminIds.add(trimmed);
    }
  }
  return adminIds;
}

/**
 * Verifies if a given user ID is an authorized channel administrator.
 *
 * @param userId Numeric Telegram user ID (number or string)
 * @param configuredAdminIds Optional explicit array or Set of admin IDs; defaults to reading process.env.TELEGRAM_ADMIN_IDS
 * @returns boolean true if authorized, false otherwise
 */
export function verifyChannelAdmin(
  userId: string | number | undefined | null,
  configuredAdminIds?: string[] | Set<string>
): boolean {
  if (userId === undefined || userId === null) {
    return false;
  }

  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) {
    return false;
  }

  let adminSet: Set<string>;
  if (configuredAdminIds instanceof Set) {
    adminSet = configuredAdminIds;
  } else if (Array.isArray(configuredAdminIds)) {
    adminSet = new Set(configuredAdminIds.map((id) => String(id).trim()));
  } else {
    adminSet = parseAdminIds(process.env.TELEGRAM_ADMIN_IDS);
  }

  const isAuthorized = adminSet.has(normalizedUserId);

  if (!isAuthorized) {
    console.warn(`[TelegramAdminGate] Unauthorized administrative attempt from user ID: ${normalizedUserId}`);
  }

  return isAuthorized;
}

/**
 * Validates the Telegram Webhook secret token header (X-Telegram-Bot-Api-Secret-Token)
 * against the configured TELEGRAM_WEBHOOK_SECRET.
 */
export function verifyWebhookSecret(
  providedSecret: string | undefined | null,
  expectedSecret?: string
): boolean {
  const secret = expectedSecret || process.env.TELEGRAM_WEBHOOK_SECRET;

  // If no secret configured, reject or allow based on strict security
  if (!secret || secret === 'your_secure_webhook_secret_here') {
    // If not configured, we do not bypass in production
    return false;
  }

  if (!providedSecret) {
    return false;
  }

  return providedSecret === secret;
}
