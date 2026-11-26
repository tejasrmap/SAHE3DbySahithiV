/**
 * Safe, Versioned LocalStorage Management Engine
 * Features: Corrupt storage recovery, input sanitization, user favorites, custom names
 */

export interface UserPreferencesSchema {
  version: number;
  favorites: string[];
  customNames: Record<string, string>;
  timePreset: string;
  weather: string;
  season: string;
  trafficEnabled: boolean;
}

const STORAGE_KEY = 'sahe3d_v2_preferences';
const CURRENT_VERSION = 2;

const DEFAULT_PREFERENCES: UserPreferencesSchema = {
  version: CURRENT_VERSION,
  favorites: ['cse-it-complex', 'admin-central-library', 'main-gate'],
  customNames: {},
  timePreset: 'noon',
  weather: 'clear',
  season: 'summer',
  trafficEnabled: true
};

export class UserPreferences {
  private static instance: UserPreferences;
  private prefs: UserPreferencesSchema;

  private constructor() {
    this.prefs = this.loadPreferences();
  }

  public static getInstance(): UserPreferences {
    if (!UserPreferences.instance) {
      UserPreferences.instance = new UserPreferences();
    }
    return UserPreferences.instance;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/[<>'"&]/g, (match) => {
        const escapeMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
          '&': '&amp;'
        };
        return escapeMap[match] || '';
      })
      .trim()
      .slice(0, 60);
  }

  private loadPreferences(): UserPreferencesSchema {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PREFERENCES };

      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return { ...DEFAULT_PREFERENCES };
      }

      // Schema version check and migration
      if (parsed.version !== CURRENT_VERSION) {
        // Migrate legacy 'sahe-names' key if present
        const legacyNames = localStorage.getItem('sahe-names');
        let migratedNames: Record<string, string> = {};
        if (legacyNames) {
          try {
            migratedNames = JSON.parse(legacyNames);
          } catch (e) {
            // ignore corrupt legacy data
          }
        }

        return {
          ...DEFAULT_PREFERENCES,
          customNames: migratedNames
        };
      }

      return {
        version: CURRENT_VERSION,
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_PREFERENCES.favorites,
        customNames: typeof parsed.customNames === 'object' && parsed.customNames ? parsed.customNames : {},
        timePreset: typeof parsed.timePreset === 'string' ? parsed.timePreset : DEFAULT_PREFERENCES.timePreset,
        weather: typeof parsed.weather === 'string' ? parsed.weather : DEFAULT_PREFERENCES.weather,
        season: typeof parsed.season === 'string' ? parsed.season : DEFAULT_PREFERENCES.season,
        trafficEnabled: typeof parsed.trafficEnabled === 'boolean' ? parsed.trafficEnabled : DEFAULT_PREFERENCES.trafficEnabled
      };
    } catch (e) {
      console.warn('Recovered from corrupted localStorage; applying safe defaults.', e);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  public savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch (e) {
      console.error('Failed to save user preferences to localStorage', e);
    }
  }

  public getPreferences(): UserPreferencesSchema {
    return { ...this.prefs };
  }

  public isFavorite(id: string): boolean {
    return this.prefs.favorites.includes(id);
  }

  public toggleFavorite(id: string): boolean {
    const idx = this.prefs.favorites.indexOf(id);
    if (idx >= 0) {
      this.prefs.favorites.splice(idx, 1);
    } else {
      this.prefs.favorites.push(id);
    }
    this.savePreferences();
    return this.isFavorite(id);
  }

  public getCustomName(id: string, defaultName: string): string {
    return this.prefs.customNames[id] || defaultName;
  }

  public setCustomName(id: string, newName: string): void {
    const clean = this.sanitizeString(newName);
    if (clean) {
      this.prefs.customNames[id] = clean;
    } else {
      delete this.prefs.customNames[id];
    }
    this.savePreferences();
  }

  public restoreDefaultName(id: string): void {
    delete this.prefs.customNames[id];
    this.savePreferences();
  }
}
