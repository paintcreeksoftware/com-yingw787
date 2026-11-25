import { type Page, expect, test } from '@playwright/test'

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

test.describe('Homepage', () => {
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

    const images = page.locator('img')
    const imageCount = await images.count()
    expect(imageCount).toBe(8)

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

    await expect(page).toHaveTitle('Page not found - Ying Wang')
    await expect(
      page.locator('meta[name="robots"][content="noindex"]'),
    ).toHaveCount(1)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeVisible()
    await expect(
      page.getByText("Sorry, we couldn't find the page you're looking for."),
    ).toBeVisible()

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(mobileOverflow).toBe(false)

    await page.getByRole('link', { name: 'Go back home' }).click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Need software?' }),
    ).toBeVisible()

    expect(errors.consoleErrors).toEqual([])
    expect(errors.pageErrors).toEqual([])
    expect(errors.failedRequests).toEqual([])
  })
})
