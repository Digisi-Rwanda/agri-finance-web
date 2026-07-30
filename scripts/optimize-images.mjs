/**
 * Regenerates the WebP derivatives committed under src/assets.
 * Run with `npm run optimize:images` after replacing any source image.
 */
import { readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets')

const TARGETS = [
  {
    source: 'auth-field-bg.png',
    out: 'auth-field-bg.webp',
    // The auth panel is full-height and roughly half the viewport, so it can use every
    // pixel the source has. Swap in a wider photo and this picks it up automatically.
    maxWidth: 2400,
    quality: 76,
    recommendedWidth: 1800,
  },
]

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

const present = new Set(await readdir(ASSETS))

for (const target of TARGETS) {
  if (!present.has(target.source)) {
    console.warn(`skip  ${target.out} — missing source ${target.source}`)
    continue
  }

  const sourcePath = join(ASSETS, target.source)
  const outPath = join(ASSETS, target.out)
  const { width: sourceWidth } = await sharp(sourcePath).metadata()

  await sharp(sourcePath)
    .resize({ width: Math.min(sourceWidth, target.maxWidth), withoutEnlargement: true })
    .webp({ quality: target.quality })
    .toFile(outPath)

  const [before, after] = await Promise.all([stat(sourcePath), stat(outPath)])
  const saved = Math.round((1 - after.size / before.size) * 100)
  console.log(`ok    ${target.out}  ${kb(before.size)} -> ${kb(after.size)}  (-${saved}%)`)

  if (target.recommendedWidth && sourceWidth < target.recommendedWidth) {
    console.warn(
      `warn  ${target.source} is ${sourceWidth}px wide; ${target.recommendedWidth}px+ ` +
        'is recommended or it will look soft on large screens.',
    )
  }
}
