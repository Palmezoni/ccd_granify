import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '../public/icons/icon.svg')
const outDir = join(__dirname, '../public/icons')

mkdirSync(outDir, { recursive: true })

const svg = readFileSync(svgPath)

for (const size of [192, 512, 180]) {
  await sharp(svg).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`))
  console.log(`Generated icon-${size}.png`)
}

console.log('All icons generated successfully!')
