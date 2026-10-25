// TALXIS base controls draw their icons with Fluent UI v8's icon font, which Fluent loads from Microsoft's
// CDN by default. A code app's content security policy only allows fonts from the app itself (font-src
// 'self'), so in Power Apps the icons would stay blank. vite.config.ts serves the icon font from the app's
// own fonts/ folder, and this points Fluent there. It also skips Fluent v8's Segoe UI web fonts: the
// system's Segoe UI is used instead, as Fluent v9 does.
// Imported first in main.tsx, because Fluent reads this setting when its modules load.
declare global {
  interface Window {
    FabricConfig?: { iconBaseUrl?: string; fontBaseUrl?: string };
  }
}

window.FabricConfig = { iconBaseUrl: new URL("fonts/", location.href).href, fontBaseUrl: "" };

export {};

