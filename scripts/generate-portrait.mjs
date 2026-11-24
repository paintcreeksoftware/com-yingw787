import sharp from 'sharp'

for (const width of [300, 420, 600, 900, 1260]) {
  const portrait = sharp('src/images/portrait.jpeg')
    .autoOrient()
    .resize({ width })
  const destination = `src/images/portrait/portrait-${width}`

  await Promise.all([
    portrait.clone().webp({ quality: 85 }).toFile(`${destination}.webp`),
    portrait
      .clone()
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(`${destination}.jpeg`),
  ])
}
