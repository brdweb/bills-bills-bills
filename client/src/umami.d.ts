// Umami Analytics type declarations
interface UmamiTracker {
  track(event: string, data?: Record<string, string | number | boolean>): void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export {};
