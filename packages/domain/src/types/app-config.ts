export interface AppConfig {
  theme: 'light' | 'dark';
  claudeModelId: string;
  anomalyThresholdPct: number;
  anomalyThresholdAbsolute: number;
  confidenceThreshold: number;
  lastSyncTimestamp?: string;
}
