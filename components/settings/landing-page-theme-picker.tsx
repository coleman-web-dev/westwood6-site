'use client';

import { Input } from '@/components/shared/ui/input';
import { THEME_PRESETS } from '@/lib/types/landing';

interface ThemePickerProps {
  selectedPreset: string | null;
  customPrimary: string | null;
  customAccent: string | null;
  onPresetChange: (presetId: string | null) => void;
  onCustomPrimaryChange: (color: string | null) => void;
  onCustomAccentChange: (color: string | null) => void;
}

export function LandingPageThemePicker({
  selectedPreset,
  customPrimary,
  customAccent,
  onPresetChange,
  onCustomPrimaryChange,
  onCustomAccentChange,
}: ThemePickerProps) {
  const isCustom = selectedPreset === null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {THEME_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onPresetChange(preset.id);
                onCustomPrimaryChange(null);
                onCustomAccentChange(null);
              }}
              className={`rounded-xl border-2 p-3 text-center transition-colors ${
                isSelected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-stroke-light dark:border-stroke-dark hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: preset.primary }}
                />
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: preset.accent }}
                />
              </div>
              <span className="text-meta text-text-primary-light dark:text-text-primary-dark">
                {preset.name}
              </span>
            </button>
          );
        })}

        {/* Custom option */}
        <button
          type="button"
          onClick={() => {
            onPresetChange(null);
            if (!customPrimary) onCustomPrimaryChange('#1D2024');
            if (!customAccent) onCustomAccentChange('#2563EB');
          }}
          className={`rounded-xl border-2 p-3 text-center transition-colors ${
            isCustom
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-stroke-light dark:border-stroke-dark hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          </div>
          <span className="text-meta text-text-primary-light dark:text-text-primary-dark">
            Custom
          </span>
        </button>
      </div>

      {isCustom && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customPrimary || '#1D2024'}
                onChange={(e) => onCustomPrimaryChange(e.target.value)}
                className="h-9 w-9 rounded cursor-pointer border-0 p-0"
              />
              <Input
                value={customPrimary || '#1D2024'}
                onChange={(e) => onCustomPrimaryChange(e.target.value)}
                className="flex-1"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customAccent || '#2563EB'}
                onChange={(e) => onCustomAccentChange(e.target.value)}
                className="h-9 w-9 rounded cursor-pointer border-0 p-0"
              />
              <Input
                value={customAccent || '#2563EB'}
                onChange={(e) => onCustomAccentChange(e.target.value)}
                className="flex-1"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
