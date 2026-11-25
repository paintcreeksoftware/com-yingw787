import sharp from 'sharp'

for (const width of [36, 64, 72, 108, 128]) {
  await sharp('src/images/avatar.webp')
    .resize(width, width)
    .webp({ quality: 85 })
    .toFile(`src/images/avatar/avatar-${width}.webp`)
}
