import sharp from 'sharp'

for (const width of [300, 420, 600, 900, 1260]) {
  await sharp('src/images/portrait.jpeg')
    .autoOrient()
    .resize({ width, height: width, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(`src/images/portrait/portrait-${width}.jpeg`)
}
