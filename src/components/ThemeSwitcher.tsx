"use client";

import React, { useEffect, useState } from 'react';
import { getSetting, upsertSetting } from '../lib/supabaseClient';

type SettingRow = { key: string; value: string };

export default function ThemeSwitcher(): React.ReactElement {
  const [color, setColor] = useState<string>('#2563eb');

  useEffect(() => {
    async function loadTheme() {
      const value = await getSetting('theme_color');
      if (value) setColor(value);
    }
    loadTheme();
  }, []);

  async function saveTheme(next: string) {
    setColor(next);
    try {
      await upsertSetting('theme_color', next);
    } catch (_err: unknown) {
      console.warn('Failed to save theme');
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm">Theme color</label>
      <input aria-label="theme-color" type="color" value={color} onChange={(e) => saveTheme(e.target.value)} className="w-10 h-8 p-0 border-0" />
    </div>
  );
}
