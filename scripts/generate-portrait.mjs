import sharp from 'sharp'

for (const width of [300, 420, 600, 900, 1260]) {
  const portrait = sharp('src/images/portrait.jpeg')
    .autoOrient()
    .resize({ width, height: width, fit: 'cover', position: 'centre' })

  await portrait
    .clone()
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(`src/images/portrait/portrait-${width}.jpeg`)
  await portrait
    .avif({ quality: 62, effort: 6 })
    .toFile(`src/images/portrait/portrait-${width}.avif`)
}
