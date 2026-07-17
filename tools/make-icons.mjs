// Rasterizes the app icon to the PNGs iOS and the manifest need.
//
// The generated PNGs are committed, so this runs rarely — only when the mark
// changes. Playwright is therefore an ad-hoc dependency, deliberately kept out
// of package.json so CI never installs a browser it doesn't need:
//
//   npm i --no-save playwright && node tools/make-icons.mjs
//
// Keep the bars here in sync with public/favicon.svg by hand.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = '#0b0a0d'
const GOLD = '#e8b04b'

// Rising equalizer bars: reads as music, and as "from the bottom up".
// `inset` shrinks the mark for maskable icons, whose outer ~20% can be cropped
// to whatever shape the launcher wants.
const mark = (inset) => `
  <g transform="translate(${inset} ${inset}) scale(${(100 - inset * 2) / 100})">
    <rect x="18" y="62" width="13" height="20" rx="5" fill="${GOLD}" />
    <rect x="43" y="42" width="13" height="40" rx="5" fill="${GOLD}" />
    <rect x="68" y="18" width="13" height="64" rx="5" fill="${GOLD}" />
  </g>`

const icons = [
  // iOS applies its own squircle mask and adds no padding, so this is drawn
  // full-bleed with the corners left square.
  { file: 'apple-touch-icon.png', size: 180, svg: `<rect width="100" height="100" fill="${BG}"/>${mark(0)}` },
  { file: 'pwa-192.png', size: 192, svg: `<rect width="100" height="100" rx="22" fill="${BG}"/>${mark(0)}` },
  { file: 'pwa-512.png', size: 512, svg: `<rect width="100" height="100" rx="22" fill="${BG}"/>${mark(0)}` },
  // Maskable: full-bleed background, mark pulled into the safe zone.
  { file: 'pwa-512-maskable.png', size: 512, svg: `<rect width="100" height="100" fill="${BG}"/>${mark(14)}` },
]

await mkdir(PUBLIC_DIR, { recursive: true })
const browser = await chromium.launch()

for (const { file, size, svg } of icons) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block}</style>
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"
          width="${size}" height="${size}">${svg}</svg>`,
  )
  await page.screenshot({ path: join(PUBLIC_DIR, file), omitBackground: true })
  await page.close()
  console.log(`wrote public/${file} (${size}x${size})`)
}

await browser.close()
