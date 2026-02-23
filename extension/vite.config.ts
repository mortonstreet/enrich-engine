import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'

// Custom plugin to copy static files and fix paths
function copyExtensionFiles(manifestPath: string) {
  return {
    name: 'copy-extension-files',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist')

      // Copy manifest.json
      copyFileSync(
        manifestPath,
        resolve(distDir, 'manifest.json')
      )

      // Copy icons
      const iconsDir = resolve(distDir, 'icons')
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true })
      }

      const srcIconsDir = resolve(__dirname, 'icons')
      if (existsSync(srcIconsDir)) {
        for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
          const srcPath = resolve(srcIconsDir, icon)
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, resolve(iconsDir, icon))
          }
        }
      }

      // Move popup HTML to correct location and fix paths
      const srcPopupHtml = resolve(distDir, 'src/popup/index.html')
      const destPopupHtml = resolve(distDir, 'popup/index.html')
      if (existsSync(srcPopupHtml)) {
        let html = readFileSync(srcPopupHtml, 'utf-8')
        // Fix relative paths - the HTML is copied from nested dir but goes to popup/
        html = html.replace(/src="\.\.\/\.\.\/popup\//g, 'src="./')
        html = html.replace(/href="\.\.\/\.\.\/popup\//g, 'href="./')
        writeFileSync(destPopupHtml, html)
      }
    },
  }
}

function resolveManifestPath(mode: string): string {
  const developmentManifest = resolve(__dirname, 'manifest.json')
  const productionManifest = resolve(__dirname, 'manifest.prod.json')

  if (mode === 'development') {
    if (!existsSync(developmentManifest)) {
      throw new Error('Missing development manifest: manifest.json')
    }
    return developmentManifest
  }

  if (!existsSync(productionManifest)) {
    throw new Error(`Missing production manifest for mode "${mode}": manifest.prod.json`)
  }

  return productionManifest
}

export default defineConfig(({ mode }) => {
  // Only development mode can include localhost permission scope.
  // All other modes must ship the production manifest.
  const manifestPath = resolveManifestPath(mode)

  return {
    plugins: [react(), copyExtensionFiles(manifestPath)],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    base: './', // Relative paths for Chrome extension
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://api.omnidial.io'),
      'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL || 'https://app.omnidial.io'),
    },
    build: {
      outDir: 'dist',
      emptyDirOnBuild: true,
      target: 'esnext',
      minify: false, // Easier debugging for extension
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          background: resolve(__dirname, 'src/background/service-worker.ts'),
          content: resolve(__dirname, 'src/content/linkedin.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') return 'background.js'
            if (chunkInfo.name === 'content') return 'content.js'
            return 'popup/[name].js'
          },
          chunkFileNames: 'popup/[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'popup/[name][extname]'
            }
            return 'popup/assets/[name][extname]'
          },
        },
      },
    },
  }
})
