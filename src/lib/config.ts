// Local configuration singleton (simulating DB settings)
// In a real production app, this would be a table in Supabase

export interface AppConfig {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyWeb: string;
  taxRate: number; // e.g. 21 for 21%
  currency: string;
}

const DEFAULT_CONFIG: AppConfig = {
  companyName: 'ODEPLAC PRO',
  companyAddress: 'Calle Falsa 123, Madrid',
  companyEmail: 'contacto@odeplac.com',
  companyWeb: 'www.odeplac.com',
  taxRate: 21,
  currency: '€'
};

// Simple mock persistence using global variable (for this session)
let currentConfig = { ...DEFAULT_CONFIG };

export const getConfig = (): AppConfig => {
  return currentConfig;
};

export const updateConfig = (newConfig: Partial<AppConfig>) => {
  currentConfig = { ...currentConfig, ...newConfig };
  return currentConfig;
};
