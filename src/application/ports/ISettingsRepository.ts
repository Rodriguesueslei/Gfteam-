export interface ISettings {
  gymName: string;
  belts: any[];
  config?: any;
  [key: string]: any;
}

export interface ISettingsRepository {
  getGlobalSettings(): Promise<ISettings | null>;
  subscribeGlobalSettings(callback: (settings: ISettings | null) => void): () => void;
  updateGlobalSettings(settings: Partial<ISettings>): Promise<void>;
}
