import { Logger } from '@nestjs/common';

export interface ExternalCallOptions {
  timeoutMs?: number;
  logger?: Logger;
  context?: string;
  resource?: string;
}

/**
 * Wrap async external calls with timeout and structured logging.
 * Does NOT change error type; caller decides how to map to BusinessException.
 */
export async function withExternalCall<T>(
  fn: () => Promise<T>,
  options: ExternalCallOptions = {},
): Promise<T> {
  const { timeoutMs = 10000, logger, context, resource } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      const err = new Error('External call timeout');
      if (logger) {
        logger.error(
          `External call timeout`,
          err.stack,
          `${context || 'ExternalCall'}${resource ? `:${resource}` : ''}`,
        );
      }
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } catch (error) {
    if (logger) {
      logger.error(
        `External call failed`,
        error instanceof Error ? error.stack : String(error),
        `${context || 'ExternalCall'}${resource ? `:${resource}` : ''}`,
      );
    }
    throw error;
  }
}
