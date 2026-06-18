/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the backend API.
   * Empty string in production (same-origin); set to `http://localhost:8080`
   * in local dev where Vite runs on port 3000 and Spring Boot on port 8080.
   */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected at build time from package.json via Vite define. */
declare const __APP_VERSION__: string;
