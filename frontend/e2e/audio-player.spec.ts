import { expect, test } from '@playwright/test'

const AUDIO_POST = '/post/the-producers-reshaping-ambient-music'
const STANDARD_POST = '/post/the-quiet-rise-of-slow-technology'

test('audio post shows the Ncmaz header and dock controls', async ({ page }) => {
  await page.goto(AUDIO_POST)
  await expect(
    page.getByRole('heading', { level: 1, name: /the producers reshaping ambient music/i }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Play audio' }).first().click()
  const dock = page.getByRole('region', { name: 'Audio player' })
  await expect(dock).toBeVisible()
  await expect(dock.getByText(/music/i).first()).toBeVisible()

  const speed = dock.getByRole('button', { name: /playback speed/i })
  await expect(speed).toHaveText('1.0x')
  await speed.click()
  await expect(speed).toHaveText('1.5x')
  await speed.click()
  await expect(speed).toHaveText('2.0x')
  await speed.click()
  await expect(speed).toHaveText('1.0x')

  await dock.getByRole('button', { name: 'Close player' }).click()
  await expect(dock).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Play audio' }).first()).toBeVisible()
})

test('back-to-top never overlaps the dock', async ({ page }) => {
  await page.goto(AUDIO_POST)
  await page.getByRole('button', { name: 'Play audio' }).first().click()
  const dock = page.getByRole('region', { name: 'Audio player' })
  const backToTop = page.getByRole('button', { name: 'Back to top' })

  await page.evaluate(() => window.scrollTo(0, 900))
  await expect(backToTop).toBeVisible()
  await expect(dock).toBeVisible()

  const assertGap = async () => {
    const dockBox = await dock.boundingBox()
    const buttonBox = await backToTop.boundingBox()
    expect(dockBox).not.toBeNull()
    expect(buttonBox).not.toBeNull()
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(dockBox!.y - 8)
  }

  await assertGap()
  expect((await dock.boundingBox())?.height).toBe(80)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dock).toBeVisible()
  expect((await dock.boundingBox())?.height).toBe(64)
  await assertGap()

  await page.getByRole('button', { name: 'Expand player' }).click()
  await expect(page.getByRole('button', { name: 'Collapse player' })).toBeVisible()
  await expect.poll(async () => (await dock.boundingBox())?.height).toBe(128)
  await assertGap()

  await page.getByRole('button', { name: 'Collapse player' }).click()
  await expect.poll(async () => (await dock.boundingBox())?.height).toBe(64)
  await assertGap()
})

test('standard posts keep their existing header without the dock', async ({ page }) => {
  await page.goto(STANDARD_POST)
  await expect(
    page.getByRole('heading', { level: 1, name: /the quiet rise of slow technology/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: 'Audio player' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Play audio' })).toHaveCount(0)
})
