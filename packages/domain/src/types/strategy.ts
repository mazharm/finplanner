export interface StrategyConfig {
  withdrawalOrder: 'taxableFirst' | 'taxDeferredFirst' | 'proRata' | 'taxOptimized';
  rebalanceFrequency: 'none' | 'annual' | 'quarterly';
  guardrailsEnabled: boolean;
}
