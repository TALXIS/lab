import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import react from '@vitejs/plugin-react'
import { powerApps } from '@microsoft/power-apps-vite';

// Serves Fluent UI v8's icon font (used by TALXIS base controls) from the app itself, under fonts/ with
// its own file names: a code app's content security policy blocks fonts from Microsoft's CDN.
// src/utils/FabricConfig.ts points Fluent at this folder.
function fluentIconFonts(): Plugin {
  // The package exports only its index and this file, so its folder is found from the file
  const iconNames = createRequire(import.meta.url).resolve('@fluentui/font-icons-mdl2/lib/data/AllIconNames.json')
  const fontsDir = path.resolve(path.dirname(iconNames), '../../fonts')
  return {
    name: 'fluent-icon-fonts',
    // npm run dev
    configureServer(server) {
      server.middlewares.use('/fonts', (req, res, next) => {
        const file = path.join(fontsDir, path.basename(req.url ?? ''))
        if (!fs.existsSync(file)) return next()
        res.setHeader('Content-Type', 'font/woff')
        fs.createReadStream(file).pipe(res)
      })
    },
    // npm run build (the DevKit builds a Debug configuration in Vite's development mode, so not only production)
    generateBundle() {
      for (const file of fs.readdirSync(fontsDir)) {
        this.emitFile({ type: 'asset', fileName: `fonts/${file}`, source: fs.readFileSync(path.join(fontsDir, file)) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    powerApps(),
    fluentIconFonts()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  }
})

