interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  // add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
