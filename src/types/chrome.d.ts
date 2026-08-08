/**
 * The web app talks to the optional Chrome extension at runtime.
 * Keep this declaration local so the Vercel build does not need the full
 * Chrome extension type package just to type-check the client bundle.
 */
interface ChromeRuntimeLastError {
  message?: string;
}

interface ChromeRuntime {
  lastError?: ChromeRuntimeLastError;
  sendMessage(
    message: unknown,
    callback?: (response?: unknown) => void,
  ): void;
}

interface ChromeApi {
  runtime: ChromeRuntime;
}

declare const chrome: ChromeApi;
