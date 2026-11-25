import { expect, test, type Page } from '@playwright/test'

const links = [
  {
    path: '/',
    name: 'social icon',
    target: (page: Page) =>
      page.getByRole('link', { name: 'Follow on GitHub' }).locator('svg'),
    property: /\bfill\b/,
  },
  {
    path: '/404',
    name: '404 home link',
    target: (page: Page) => page.getByRole('link', { name: 'Go back home' }),
    property: /\bbackground-color\b/,
  },
]

for (const { path, name, target, property } of links) {
  test(`${name} only transitions without a reduced-motion preference`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(path)
    await expect(target(page)).toHaveCSS('transition-property', property)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(target(page)).toHaveCSS('transition-property', 'none')
  })
}
