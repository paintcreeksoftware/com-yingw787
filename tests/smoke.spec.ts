import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import nodePath from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { type Locator, type Page, expect, test } from '@playwright/test'
import firebaseConfig from '../firebase.json'

interface RuntimeErrors {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
}

function trackRuntimeErrors(
  page: Page,
  allowed404Paths: string[] = [],
): RuntimeErrors {
  const errors: RuntimeErrors = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  }

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }
    const locationUrl = message.location().url
    if (locationUrl) {
      const { pathname } = new URL(locationUrl)
      if (
        allowed404Paths.includes(pathname) &&
        message.text().includes('status of 404')
      ) {
        return
      }
    }
    errors.consoleErrors.push(message.text())
  })

  page.on('pageerror', (error) => {
    errors.pageErrors.push(error.message)
  })

  page.on('requestfailed', (request) => {
    errors.failedRequests.push(
      `${request.url()} (${request.failure()?.errorText ?? 'failed'})`,
    )
  })

  page.on('response', (response) => {
    const status = response.status()
    if (status < 400) {
      return
    }
    const { pathname } = new URL(response.url())
    if (status === 404 && allowed404Paths.includes(pathname)) {
      return
    }
    errors.failedRequests.push(`${status} ${response.url()}`)
  })

  return errors
}

test.describe('Header avatar', () => {
  for (const deviceScaleFactor of [1, 2, 3]) {
    test.describe(`${deviceScaleFactor}x`, () => {
      test.use({ deviceScaleFactor })

      for (const { path, width } of [
        { path: '/', width: 64 },
        { path: '/this-page-does-not-exist', width: 36 },
      ]) {
        test(`loads only the matching avatar variant on ${path}`, async ({
          page,
        }) => {
          const avatarRequests: string[] = []
          page.on('request', (request) => {
            const { pathname } = new URL(request.url())
            if (/\/avatar[-.][^/]+\.webp$/.test(pathname)) {
              avatarRequests.push(pathname)
            }
          })

          await page.goto(path, { waitUntil: 'networkidle' })
          const avatar = page.locator('header a[aria-label="Home"] img')
          const currentSrc = await avatar.evaluate(
            async (image: HTMLImageElement) => {
              await image.decode()
              return new URL(image.currentSrc).pathname
            },
          )
          const variantWidth = width * deviceScaleFactor
          const variantName =
            variantWidth === 192 ? 'avatar' : `avatar-${variantWidth}`

          await expect(avatar).toHaveCSS('width', `${width}px`)
          expect(currentSrc).toMatch(
            new RegExp(`/media/${variantName}\\.[^/]+\\.webp$`),
          )
          expect(avatarRequests).toEqual([currentSrc])
        })
      }
    })
  }
})

test.describe('Accessibility structure', () => {
  for (const { path, status, firstContentLink } of [
    { path: '/', status: 200, firstContentLink: 'Follow on GitHub' },
    {
      path: '/this-page-does-not-exist',
      status: 404,
      firstContentLink: 'Go back home',
    },
  ]) {
    test(`passes WCAG A/AA axe checks on ${path}`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(status)

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(violations).toEqual([])
    })

    test(`skips directly to main content on ${path}`, async ({ page }) => {
      await page.goto(path)

      const skipLink = page.getByRole('link', { name: 'Skip to content' })
      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(`${path}#main-content`)
      await expect(page.getByRole('main')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(
        page.getByRole('link', { name: firstContentLink }),
      ).toBeFocused()
    })
  }

  test('exposes homepage text structure and hides decorative social icons', async ({
    page,
  }) => {
    await page.goto('/')

    await expect
      .soft(page.getByRole('link', { name: 'Home', exact: true }))
      .toHaveAttribute('aria-current', 'page')
    await expect
      .soft(page.getByRole('paragraph').filter({ hasText: 'I’m Ying' }))
      .toHaveCount(1)

    const testimonials = page.getByRole('region', { name: 'Testimonials' })
    await expect
      .soft(
        testimonials.getByRole('heading', { level: 2, name: 'Testimonials' }),
      )
      .toHaveCount(1)
    await expect
      .soft(testimonials.locator('article figure blockquote'))
      .toHaveCount(6)

    const socialIcons = page
      .getByRole('link', {
        name: /^(Follow on GitHub|Follow on LinkedIn|Personal Blog|Professional Blog|Email)$/,
      })
      .locator('svg')
    await expect(socialIcons).toHaveCount(5)
    await expect
      .soft(socialIcons.and(page.locator('[aria-hidden="true"]')))
      .toHaveCount(5)
  })

  test('does not mark the Home avatar as current on the 404 page', async ({
    page,
  }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(
      page.getByRole('link', { name: 'Home', exact: true }),
    ).not.toHaveAttribute('aria-current', 'page')
  })
})

test.describe('Homepage', () => {
  test('downloads the portrait only once, as AVIF', async ({ page }) => {
    const portraitRequests: string[] = []
    page.on('request', (request) => {
      const { pathname } = new URL(request.url())
      if (/\/portrait-\d+\.[^/]+\.(avif|jpeg)$/.test(pathname)) {
        portraitRequests.push(pathname)
      }
    })

    await page.goto('/', { waitUntil: 'networkidle' })

    expect(portraitRequests).toEqual([
      expect.stringMatching(/\/portrait-420\.[^/]+\.avif$/),
    ])
  })

  test('hydrates /index.html with the same header avatar as /', async ({
    page,
  }) => {
    const avatar = page
      .getByRole('link', { name: 'Home', exact: true })
      .locator('img')

    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(avatar).toBeVisible()
    const homeAvatar = await avatar.boundingBox()

    const errors = trackRuntimeErrors(page)
    const response = await page.goto('/index.html', {
      waitUntil: 'networkidle',
    })
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL('/index.html')
    await expect(avatar).toBeVisible()

    expect.soft(errors.consoleErrors).toEqual([])
    expect.soft(errors.pageErrors).toEqual([])
    expect.soft(errors.failedRequests).toEqual([])
    expect.soft(await avatar.boundingBox()).toEqual(homeAvatar)
  })

  test('does not prefetch its own route', async ({ page }) => {
    const prefetchRequests: string[] = []
    page.on('request', (request) => {
      const { pathname } = new URL(request.url())
      const method = request.method()

      if (
        (method === 'HEAD' && pathname === '/') ||
        pathname === '/__next._tree.txt' ||
        pathname === '/__next.__PAGE__.txt'
      ) {
        prefetchRequests.push(`${method} ${pathname}`)
      }
    })

    const response = await page.goto('/', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    expect(prefetchRequests).toEqual([])
  })

  test('renders key content, images, and links with no runtime errors', async ({
    page,
  }) => {
    const errors = trackRuntimeErrors(page)

    const response = await page.goto('/', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)

    await expect(page).toHaveTitle(/Ying Wang/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Need software?' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    )
    await expect(page.locator('footer')).toContainText(
      'Ying Wang. All rights reserved.',
    )

    const expectedSocialLinks = [
      { name: 'Follow on GitHub', href: 'https://github.com/yingw787' },
      { name: 'Follow on LinkedIn', href: 'https://linkedin.com/in/yingw787' },
      { name: 'Personal Blog', href: 'https://blog.yingw787.com' },
      { name: 'Professional Blog', href: 'https://bytes.yingw787.com' },
      { name: 'Email', href: 'mailto:ying@paintcreeksoftware.com' },
    ]

    for (const { name, href } of expectedSocialLinks) {
      await expect(page.getByRole('link', { name })).toHaveAttribute(
        'href',
        href,
      )
    }

    await expect(page.locator('blockquote')).toHaveCount(6)
    const acquisitionQuote = page
      .locator('blockquote')
      .filter({ hasText: 'integrations I’ve worked on' })
    await expect(acquisitionQuote).toBeVisible()
    await expect(acquisitionQuote).toContainText('they’re stuck with')

    const images = page.locator('img')
    const imageCount = await images.count()
    expect(imageCount).toBe(5)

    for (let i = 0; i < imageCount; i += 1) {
      const img = images.nth(i)
      await img.scrollIntoViewIfNeeded()
      await expect(img).toBeVisible()
      await expect
        .poll(() =>
          img.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        )
        .toBe(true)
    }

    expect(errors.consoleErrors).toEqual([])
    expect(errors.pageErrors).toEqual([])
    expect(errors.failedRequests).toEqual([])
  })

  test('parses Firebase Hosting security headers with no console warnings', async ({
    page,
  }) => {
    const globalRule = firebaseConfig.hosting.headers.find(
      (rule) => 'source' in rule && rule.source === '**',
    )
    expect(globalRule).toBeDefined()

    const configuredHeaders = Object.fromEntries(
      (globalRule?.headers ?? []).map(({ key, value }) => [key, value]),
    )

    await page.route('/', async (route) => {
      const response = await route.fetch()
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          ...configuredHeaders,
        },
      })
    })

    const consoleWarnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning') {
        consoleWarnings.push(message.text())
      }
    })

    const response = await page.goto('/', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    expect(consoleWarnings).toEqual([])
    expect(response?.headers()['x-content-type-options']).toBe('nosniff')
    expect(response?.headers()['referrer-policy']).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(response?.headers()['x-frame-options']).toBe('DENY')
    expect(response?.headers()['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    )
  })

  test('names Mr. Cooper and its acquirer in the Eshelman caption', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.locator('figcaption').filter({ hasText: 'Mike Eshelman' }),
    ).toContainText('fmr. CMO of Mr. Cooper (acq. Rocket Companies)')
  })

  test('has no horizontal overflow on mobile and desktop viewports', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'networkidle' })

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(mobileOverflow).toBe(false)
    await expect(page.getByText('GitHub', { exact: true })).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 800 })
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(desktopOverflow).toBe(false)
    await expect(page.getByText('GitHub', { exact: true })).toBeHidden()
  })

  test('starts the hero heading within the top quarter on mobile and tablet', async ({
    page,
  }) => {
    await page.goto('/')

    const heading = page.getByRole('heading', {
      level: 1,
      name: 'Need software?',
    })
    for (const [width, height] of [
      [320, 568],
      [375, 667],
      [768, 1024],
    ] as const) {
      await page.setViewportSize({ width, height })
      await expect(heading).toBeVisible()
      const top = await heading.evaluate(
        (element) => element.getBoundingClientRect().top,
      )
      expect(top, `Heading top at ${width}×${height}`).toBeLessThan(height / 4)
    }
  })

  test('reflows social link pills within their container at 200% text zoom on narrow viewports', async ({
    page,
  }) => {
    const socialLinkNames = [
      'Follow on GitHub',
      'Follow on LinkedIn',
      'Personal Blog',
      'Professional Blog',
      'Email',
    ]

    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.addStyleTag({
        content: 'html { font-size: 200% !important; }',
      })

      const containerBox = await page
        .getByRole('link', { name: 'Follow on GitHub' })
        .locator('..')
        .boundingBox()
      expect(containerBox).not.toBeNull()

      for (const name of socialLinkNames) {
        const link = page.getByRole('link', { name })
        const linkBox = await link.boundingBox()
        const labelBox = await link.locator('span').boundingBox()

        expect(linkBox).not.toBeNull()
        expect(labelBox).not.toBeNull()

        if (containerBox && linkBox && labelBox) {
          expect(
            linkBox.x + linkBox.width,
            `${name} pill overflows container at ${width}px`,
          ).toBeLessThanOrEqual(containerBox.x + containerBox.width + 0.5)
          expect(
            linkBox.x + linkBox.width,
            `${name} pill overflows viewport at ${width}px`,
          ).toBeLessThanOrEqual(width + 0.5)
          expect(
            labelBox.x + labelBox.width,
            `${name} label overflows pill at ${width}px`,
          ).toBeLessThanOrEqual(linkBox.x + linkBox.width + 0.5)
        }
      }
    }
  })

  test('applies light and dark color schemes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'light')
    const body = page.locator('body')
    await expect(body).not.toHaveCSS('background-color', 'rgb(0, 0, 0)')

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
    await expect(body).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('centers the tablet portrait and keeps the small desktop headline on one line', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 980 })
    await page.goto('/')

    const center = await page.evaluate(
      () => document.documentElement.clientWidth / 2,
    )
    const portrait = await page.locator('main img').first().boundingBox()
    expect(portrait).not.toBeNull()
    if (portrait) {
      expect.soft(portrait.x + portrait.width / 2).toBeCloseTo(center)
    }

    await page.setViewportSize({ width: 1024, height: 980 })
    const heading = page.getByRole('heading', {
      level: 1,
      name: 'Need software?',
    })
    const lines = await heading.evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return new Set(Array.from(range.getClientRects(), (rect) => rect.top))
        .size
    })
    expect(lines).toBe(1)
  })

  test('uses the higher-contrast testimonial gold only in light mode', async ({
    page,
  }) => {
    const star = page
      .locator('figure')
      .filter({ hasText: '5 out of 5 stars' })
      .locator('svg path')
      .first()
    const starFill = () =>
      star.evaluate((path) => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Could not measure testimonial star fill')
        }
        context.fillStyle = getComputedStyle(path).fill
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data)
      })

    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect.poll(starFill).toEqual([195, 131, 0, 255])

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(starFill).toEqual([240, 177, 0, 255])
  })

  test('uses secondary text for testimonial roles only when a name is present', async ({
    page,
  }) => {
    await page.goto('/')

    const intro = page.getByText(/^I’m Ying, a software engineer and founder/)
    const namedRole = page.getByText(
      'fmr. CMO of Mr. Cooper (acq. Rocket Companies)',
      {
        exact: true,
      },
    )
    const unnamedRole = page.getByText(
      'VP of Acquisition Marketing, Series F security startup',
      { exact: true },
    )
    const unnamedQuote = page
      .locator('figure')
      .filter({ has: unnamedRole })
      .locator('blockquote p')
    const textColor = (locator: Locator) =>
      locator.evaluate((element) => getComputedStyle(element).color)

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await expect(namedRole).toHaveCSS('color', await textColor(intro))
      await expect(unnamedRole).toHaveCSS(
        'color',
        await textColor(unnamedQuote),
      )
    }
  })

  test('themes fallback avatars and unloaded testimonial photos', async ({
    page,
  }) => {
    const photoPath = /\/picture_mike_eshelman\.[^/]+\.webp$/
    const photoReady = Promise.withResolvers<undefined>()
    await page.route(photoPath, async (route) => {
      await photoReady.promise
      await route.continue()
    })

    await page.emulateMedia({ colorScheme: 'light' })
    const photoRequest = page.waitForRequest(photoPath)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const captions = page.locator('figcaption')
    const photoAvatar = captions
      .filter({ hasText: 'Mike Eshelman' })
      .locator(':scope > span[aria-hidden="true"]')
    const photo = photoAvatar.locator('img')
    const placeholderAvatars = [
      'VP of Acquisition Marketing',
      'Lihan Zhang',
      'Addison Jones',
    ].map((name) =>
      captions
        .filter({ hasText: name })
        .locator(':scope > span[aria-hidden="true"]'),
    )
    const readColor = (
      locator: Locator,
      cssProperty: 'background-color' | 'color',
    ) =>
      locator.evaluate((element, property) => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Could not measure testimonial avatar color')
        }
        context.fillStyle = getComputedStyle(element).getPropertyValue(property)
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data)
      }, cssProperty)

    try {
      await photoAvatar.scrollIntoViewIfNeeded()
      await photoRequest
      await expect(photo).toHaveJSProperty('complete', false)
      for (const [scheme, background, glyphColor] of [
        ['light', [244, 244, 245, 255], [113, 113, 123, 255]],
        ['dark', [39, 39, 42, 255], [159, 159, 169, 255]],
      ] as const) {
        await page.emulateMedia({ colorScheme: scheme })
        await expect
          .poll(() => readColor(photoAvatar, 'background-color'))
          .toEqual(background)
        for (const avatar of placeholderAvatars) {
          await expect
            .poll(() => readColor(avatar, 'background-color'))
            .toEqual(background)
          await expect(avatar.locator('img')).toHaveCount(0)
          await expect
            .poll(() => readColor(avatar.locator('svg'), 'color'))
            .toEqual(glyphColor)
        }
      }
      await expect(photo).toHaveJSProperty('complete', false)
    } finally {
      photoReady.resolve(undefined)
    }
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
  })

  test('shows shape-matched focus-visible rings on keyboard navigation', async ({
    page,
  }) => {
    const readFocusRing = (locator: Locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Could not measure focus outline color')
        }
        context.fillStyle = style.outlineColor
        context.fillRect(0, 0, 1, 1)
        return {
          display: style.display,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
          borderRadius: parseFloat(style.borderRadius),
          outlineColor: Array.from(context.getImageData(0, 0, 1, 1).data),
        }
      })

    const expectedRingColor = {
      light: [24, 24, 27, 255],
      dark: [244, 244, 245, 255],
    } as const
    const tabToSkipLink = async () => {
      await page.keyboard.press('Tab')
      await expect(
        page.getByRole('link', { name: 'Skip to content' }),
      ).toBeFocused()
    }

    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/', { waitUntil: 'networkidle' })

      await tabToSkipLink()
      await page.keyboard.press('Tab')
      const homeAvatar = page.getByRole('link', { name: 'Home', exact: true })
      await expect(homeAvatar).toBeFocused()
      const homeAvatarRing = await readFocusRing(homeAvatar)
      expect(homeAvatarRing).toMatchObject({
        display: 'block',
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '2px',
        outlineColor: expectedRingColor[scheme],
      })
      expect(homeAvatarRing.borderRadius).toBeGreaterThanOrEqual(9999)

      await page.keyboard.press('Tab')
      const githubLink = page.getByRole('link', { name: 'Follow on GitHub' })
      await expect(githubLink).toBeFocused()
      expect(await readFocusRing(githubLink)).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '2px',
        borderRadius: 6,
        outlineColor: expectedRingColor[scheme],
      })

      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press('Tab')
      }
      const testimonialLink = page.getByRole('link', { name: 'Mike Eshelman' })
      await expect(testimonialLink).toBeFocused()
      expect(await readFocusRing(testimonialLink)).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '2px',
        borderRadius: 4,
        outlineColor: expectedRingColor[scheme],
      })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await tabToSkipLink()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      const mobileGithubLink = page.getByRole('link', {
        name: 'Follow on GitHub',
      })
      await expect(mobileGithubLink).toBeFocused()
      const mobileRing = await readFocusRing(mobileGithubLink)
      expect(mobileRing).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '2px',
        outlineColor: expectedRingColor[scheme],
      })
      expect(mobileRing.borderRadius).toBeGreaterThanOrEqual(9999)

      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/404', { waitUntil: 'networkidle' })
      await tabToSkipLink()
      await page.keyboard.press('Tab')
      const smallAvatar = page.getByRole('link', { name: 'Home', exact: true })
      await expect(smallAvatar).toBeFocused()
      const smallAvatarRing = await readFocusRing(smallAvatar)
      expect(smallAvatarRing).toMatchObject({
        display: 'block',
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '2px',
        outlineColor: expectedRingColor[scheme],
      })
      expect(smallAvatarRing.borderRadius).toBeGreaterThanOrEqual(9999)

      await page.keyboard.press('Tab')
      const backButton = page.getByRole('link', { name: 'Go back home' })
      await expect(backButton).toBeFocused()
      await expect
        .poll(() => readFocusRing(backButton))
        .toMatchObject({
          outlineStyle: 'solid',
          outlineWidth: '2px',
          outlineOffset: '2px',
          borderRadius: 6,
          outlineColor: expectedRingColor[scheme],
        })
    }
  })
})

test.describe('Dark scheme without JavaScript', () => {
  test.use({ colorScheme: 'dark', javaScriptEnabled: false })

  for (const path of ['/', '/this-page-does-not-exist']) {
    test(`renders ${path} with the dark palette`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(0, 0, 0)',
      )
    })
  }
})

test.describe('404 page', () => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1440, height: 900 },
  ]) {
    test(`centers the content at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/this-page-does-not-exist')

      const label = await page.getByText('404', { exact: true }).boundingBox()
      const button = await page
        .getByRole('link', { name: 'Go back home' })
        .boundingBox()
      if (!label || !button) throw new Error('404 content is not visible')

      const center = (label.y + button.y + button.height) / 2
      expect(Math.abs(center - viewport.height / 2)).toBeLessThanOrEqual(2)
    })
  }

  test('keeps the content in view in short landscape', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 })
    await page.goto('/this-page-does-not-exist')
    await expect(
      page.getByRole('link', { name: 'Go back home' }),
    ).toBeInViewport({ ratio: 1 })
  })

  test('renders the avatar as a circular block with hover feedback', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/this-page-does-not-exist')
    const avatar = page.getByRole('link', { name: 'Home', exact: true })

    await expect(avatar).toHaveCSS('display', 'block')
    await expect(avatar).toHaveCSS('opacity', '1')
    await avatar.hover()
    await expect(avatar).toHaveCSS('opacity', '0.8')
    await expect(avatar).toHaveCSS('transition-duration', '0s')
  })

  test('keeps a home button border in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const response = await page.goto('/this-page-does-not-exist')
    expect(response?.status()).toBe(404)

    const homeButton = page.getByRole('link', { name: 'Go back home' })
    await expect(homeButton).toHaveCSS('border-top-style', 'solid')
    await expect(homeButton).toHaveCSS('border-top-width', '1px')
  })

  test('serves the exported page at its clean URL', async ({ page }) => {
    const response = await page.goto('/404')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL('/404')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeVisible()
  })

  test('renders 404 page with no overflow and navigates back home', async ({
    page,
  }) => {
    const missingPath = '/this-page-does-not-exist'
    const errors = trackRuntimeErrors(page, [missingPath])

    await page.setViewportSize({ width: 390, height: 844 })
    const response = await page.goto(missingPath, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(404)

    const avatar = page
      .getByRole('link', { name: 'Home', exact: true })
      .locator('img')
    await expect(avatar).toHaveCSS('width', '36px')
    await expect(page).toHaveTitle('Page not found - Ying Wang')
    await expect(
      page.locator('meta[name="robots"][content="noindex"]'),
    ).toHaveCount(1)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeVisible()
    await expect(
      page.getByText('Sorry, we couldn’t find the page you’re looking for.'),
    ).toBeVisible()

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(mobileOverflow).toBe(false)

    await page.getByRole('link', { name: 'Go back home' }).click()
    await expect(page).toHaveURL('/')
    await expect(avatar).toHaveCSS('width', '64px')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Need software?' }),
    ).toBeVisible()

    expect(errors.consoleErrors).toEqual([])
    expect(errors.pageErrors).toEqual([])
    expect(errors.failedRequests).toEqual([])
  })
})

interface FirebaseHeaderRule {
  source?: string
  regex?: string
  headers: Array<{ key: string; value: string }>
}

interface FirebaseHostingConfig {
  hosting: {
    headers?: FirebaseHeaderRule[]
  }
}

function resolveFirebaseHeaders(
  config: FirebaseHostingConfig,
  urlPath: string,
): Record<string, string> {
  // Firebase Hosting defaults to max-age=3600 when no rule sets Cache-Control.
  const resolved: Record<string, string> = {
    'Cache-Control': 'max-age=3600',
  }
  for (const rule of config.hosting.headers ?? []) {
    const matched = rule.regex
      ? new RegExp(rule.regex).test(urlPath)
      : rule.source === '**' || rule.source === urlPath
    if (matched) {
      for (const { key, value } of rule.headers) {
        resolved[key] = value
      }
    }
  }
  return resolved
}

function loadGeneratedFirebaseConfig(): FirebaseHostingConfig {
  const tempDir = mkdtempSync(nodePath.join(tmpdir(), 'firebase-headers-'))
  const outputPath = nodePath.join(tempDir, 'firebase.json')
  try {
    execFileSync(
      'node',
      ['scripts/apply-asset-cache-headers.mjs', '--output', outputPath],
      { stdio: 'pipe' },
    )
    return JSON.parse(readFileSync(outputPath, 'utf8')) as FirebaseHostingConfig
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function contentTypeForPath(filePath: string): string {
  switch (nodePath.extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'application/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.webp':
      return 'image/webp'
    case '.jpeg':
      return 'image/jpeg'
    case '.ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

test.describe('Firebase Hosting cache rules', () => {
  test('only gives immutable caching to built hashed assets and never to HTML or missing paths', () => {
    const config = loadGeneratedFirebaseConfig()
    const outDir = nodePath.resolve('out')
    const mediaDir = nodePath.join(outDir, '_next/static/media')
    const chunksDir = nodePath.join(outDir, '_next/static/chunks')

    const existingMedia = readdirSync(mediaDir).find((file) =>
      file.startsWith('picture_mike_eshelman.'),
    )
    const existingChunk = readdirSync(chunksDir).find((file) =>
      file.endsWith('.css'),
    )
    expect(existingMedia).toBeDefined()
    expect(existingChunk).toBeDefined()

    const rootHeaders = resolveFirebaseHeaders(config, '/')
    expect(rootHeaders['Cache-Control']).toBe('no-cache')
    expect(rootHeaders['X-Frame-Options']).toBe('DENY')

    const mediaHeaders = resolveFirebaseHeaders(
      config,
      `/_next/static/media/${existingMedia ?? ''}`,
    )
    expect(mediaHeaders['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(mediaHeaders['X-Content-Type-Options']).toBe('nosniff')

    const chunkHeaders = resolveFirebaseHeaders(
      config,
      `/_next/static/chunks/${existingChunk ?? ''}`,
    )
    expect(chunkHeaders['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    )

    const missingMediaHeaders = resolveFirebaseHeaders(
      config,
      '/_next/static/media/picture_mike_eshelman.0000000000000.webp',
    )
    expect(missingMediaHeaders['Cache-Control']).toBe('no-cache')

    const missingChunkHeaders = resolveFirebaseHeaders(
      config,
      '/_next/static/chunks/0000000000000.js',
    )
    expect(missingChunkHeaders['Cache-Control']).toBe('no-cache')
  })

  test('does not cache missing hashed asset 404s or stale HTML across deploys', async ({
    browser,
  }) => {
    const config = loadGeneratedFirebaseConfig()
    const outDir = nodePath.resolve('out')
    const mediaFiles = readdirSync(nodePath.join(outDir, '_next/static/media'))
    const currentAvatarFile = mediaFiles.find((file) =>
      file.startsWith('picture_mike_eshelman.'),
    )
    expect(currentAvatarFile).toBeDefined()

    const currentAvatarPath = `/_next/static/media/${currentAvatarFile ?? ''}`
    const staleAvatarPath =
      '/_next/static/media/picture_mike_eshelman.0000000000000.webp'
    const avatarBytes = readFileSync(
      nodePath.join(outDir, currentAvatarPath.slice(1)),
    )
    const currentHtml = readFileSync(
      nodePath.join(outDir, 'index.html'),
      'utf8',
    )
    const staleHtml = currentHtml.replaceAll(currentAvatarPath, staleAvatarPath)
    const notFoundHtml = readFileSync(nodePath.join(outDir, '404.html'), 'utf8')

    let serveCurrentHtml = false
    let staleAvatarRestored = false
    let staleAvatarOriginHits = 0

    const server = createServer((req, res) => {
      const urlPath = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
      const headers = resolveFirebaseHeaders(config, urlPath)

      if (urlPath === '/' || urlPath === '/index.html') {
        res.writeHead(200, {
          ...headers,
          'Content-Type': 'text/html; charset=utf-8',
        })
        res.end(serveCurrentHtml ? currentHtml : staleHtml)
        return
      }

      if (urlPath === staleAvatarPath) {
        staleAvatarOriginHits += 1
        if (!staleAvatarRestored) {
          res.writeHead(404, {
            ...headers,
            'Content-Type': 'text/html; charset=utf-8',
          })
          res.end(notFoundHtml)
          return
        }
        res.writeHead(200, { ...headers, 'Content-Type': 'image/webp' })
        res.end(avatarBytes)
        return
      }

      const filePath = nodePath.join(outDir, urlPath.slice(1))
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        res.writeHead(200, {
          ...headers,
          'Content-Type': contentTypeForPath(filePath),
        })
        res.end(readFileSync(filePath))
        return
      }

      res.writeHead(404, {
        ...headers,
        'Content-Type': 'text/html; charset=utf-8',
      })
      res.end(notFoundHtml)
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve()
      })
    })
    const { port } = server.address() as AddressInfo
    const origin = `http://127.0.0.1:${String(port)}`

    const context = await browser.newContext()
    try {
      // 1. Stale HTML requests a missing hashed avatar -> 404 with no-cache.
      const page1 = await context.newPage()
      let firstStatus: number | null = null
      let firstCacheControl: string | undefined
      page1.on('response', (response) => {
        if (new URL(response.url()).pathname === staleAvatarPath) {
          firstStatus = response.status()
          firstCacheControl = response.headers()['cache-control']
        }
      })

      await page1.goto(origin, { waitUntil: 'networkidle' })
      const avatar1 = page1
        .locator('figcaption')
        .filter({ hasText: 'Mike Eshelman' })
        .locator('img')
      await avatar1.scrollIntoViewIfNeeded()
      await expect.poll(() => firstStatus).toBe(404)
      expect(firstCacheControl).toBe('no-cache')
      expect(
        await avatar1.evaluate((img: HTMLImageElement) => img.naturalWidth),
      ).toBe(0)
      expect(staleAvatarOriginHits).toBe(1)

      // 2. Restore the missing asset at the origin; same browser cache must revalidate and load 200.
      staleAvatarRestored = true
      const page2 = await context.newPage()
      let secondStatus: number | null = null
      page2.on('response', (response) => {
        if (new URL(response.url()).pathname === staleAvatarPath) {
          secondStatus = response.status()
        }
      })

      await page2.goto(origin, { waitUntil: 'networkidle' })
      const avatar2 = page2
        .locator('figcaption')
        .filter({ hasText: 'Mike Eshelman' })
        .locator('img')
      await avatar2.scrollIntoViewIfNeeded()
      await expect.poll(() => secondStatus).toBe(200)
      await expect
        .poll(() =>
          avatar2.evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0)
      expect(staleAvatarOriginHits).toBe(2)

      // 3. New deploy swaps HTML to the new hashed avatar and removes the old one;
      //    same browser cache must revalidate HTML and load the new avatar without hitting the old URL.
      serveCurrentHtml = true
      staleAvatarRestored = false
      const hitsBeforeDeploy = staleAvatarOriginHits
      const page3 = await context.newPage()
      let currentAssetStatus: number | null = null
      let currentAssetCacheControl: string | undefined
      page3.on('response', (response) => {
        if (new URL(response.url()).pathname === currentAvatarPath) {
          currentAssetStatus = response.status()
          currentAssetCacheControl = response.headers()['cache-control']
        }
      })

      await page3.goto(origin, { waitUntil: 'networkidle' })
      const avatar3 = page3
        .locator('figcaption')
        .filter({ hasText: 'Mike Eshelman' })
        .locator('img')
      await avatar3.scrollIntoViewIfNeeded()
      await expect.poll(() => currentAssetStatus).toBe(200)
      expect(currentAssetCacheControl).toBe(
        'public, max-age=31536000, immutable',
      )
      await expect
        .poll(() =>
          avatar3.evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0)
      expect(staleAvatarOriginHits).toBe(hitsBeforeDeploy)
    } finally {
      await context.close()
      server.close()
    }
  })
})
