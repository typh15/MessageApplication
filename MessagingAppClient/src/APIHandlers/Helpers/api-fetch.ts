import { apiUrl } from './config';

const DEFAULT_ATTEMPT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 10_000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429]);
const SAFE_METHODS = new Set(['GET', 'HEAD']);

export type ApiRetryMode = 'safe' | 'always' | 'never';

export type ApiFetchOptions = {
    attemptTimeoutMs?: number;
    maxAttempts?: number;
    retryMode?: ApiRetryMode;
};

export class ApiNetworkError extends Error {
    readonly attempts: number;
    readonly cause: unknown;
    readonly isTimeout: boolean;

    constructor(attempts: number, cause: unknown, isTimeout: boolean) {
        super(isTimeout
            ? 'The server took too long to respond. Check your connection and try again.'
            : 'Unable to reach the server. Check your internet connection and Server URL.');
        this.name = 'ApiNetworkError';
        this.attempts = attempts;
        this.cause = cause;
        this.isTimeout = isTimeout;
    }
}

export async function apiFetch(
    path: string,
    init: RequestInit = {},
    options: ApiFetchOptions = {}
): Promise<Response> {
    const url = await apiUrl(path);
    const method = (init.method ?? 'GET').toUpperCase();
    const retryMode = options.retryMode ?? 'safe';
    const configuredMaxAttempts = normalizePositiveInteger(
        options.maxAttempts,
        DEFAULT_MAX_ATTEMPTS
    );
    const maxAttempts = canRetryMethod(method, retryMode) ? configuredMaxAttempts : 1;
    const attemptTimeoutMs = normalizePositiveInteger(
        options.attemptTimeoutMs,
        DEFAULT_ATTEMPT_TIMEOUT_MS
    );
    let lastError: unknown;
    let lastAttemptTimedOut = false;
    let retryDelayMs = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (retryDelayMs > 0) {
            await wait(retryDelayMs);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
        const removeAbortListener = forwardAbort(init.signal, controller);

        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
            });

            if (!isRetryableResponse(response) || attempt === maxAttempts) {
                return response;
            }

            retryDelayMs = parseRetryAfterMs(response.headers.get('Retry-After'))
                ?? calculateRetryDelayMs(attempt + 1);
            await response.text();
        } catch (error) {
            if (init.signal?.aborted) {
                throw error;
            }

            lastError = error;
            lastAttemptTimedOut = controller.signal.aborted;
            retryDelayMs = calculateRetryDelayMs(attempt + 1);

            if (attempt === maxAttempts) {
                break;
            }
        } finally {
            clearTimeout(timeoutId);
            removeAbortListener();
        }
    }

    throw new ApiNetworkError(maxAttempts, lastError, lastAttemptTimedOut);
}

function canRetryMethod(method: string, retryMode: ApiRetryMode) {
    if (retryMode === 'always') {
        return true;
    }

    if (retryMode === 'never') {
        return false;
    }

    return SAFE_METHODS.has(method);
}

function isRetryableResponse(response: Response) {
    return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;
}

function calculateRetryDelayMs(attempt: number) {
    const exponentialDelayMs = 400 * 2 ** (attempt - 2);
    const jitterMs = Math.floor(Math.random() * 200);
    return Math.min(exponentialDelayMs + jitterMs, MAX_RETRY_DELAY_MS);
}

function parseRetryAfterMs(value: string | null) {
    if (!value) {
        return null;
    }

    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }

    const date = Date.parse(value);
    if (Number.isNaN(date)) {
        return null;
    }

    return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_DELAY_MS);
}

function forwardAbort(signal: AbortSignal | null | undefined, controller: AbortController) {
    if (!signal) {
        return () => undefined;
    }

    if (signal.aborted) {
        controller.abort();
        return () => undefined;
    }

    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    return () => signal.removeEventListener('abort', abort);
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
    if (value === undefined || !Number.isFinite(value) || value < 1) {
        return fallback;
    }

    return Math.floor(value);
}

function wait(delayMs: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
