import { expect, test } from '@playwright/test'

test('home renders the hero and opens a story', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /the quiet rise of slow technology/i,
    }),
  ).toBeVisible()

  await page.getByRole('link', { name: /read story/i }).click()
  await expect(page).toHaveURL(/\/post\/the-quiet-rise-of-slow-technology$/)
  await expect(page.getByRole('heading', { name: /comments/i })).toBeVisible()
})

test('search from the header navigates to results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /type to search/i }).click()
  const input = page.getByLabel('Search query')
  await input.fill('design')
  await input.press('Enter')

  await expect(page).toHaveURL(/\/search\?q=design$/)
  await expect(page.getByText(/result.* for/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /find your next read/i })).toBeVisible()
})

test('demo user can sign in and reach the dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('demo')
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Demo Reader' })).toBeVisible()
  await expect(page.getByText(/published stories/i)).toBeVisible()
})

test('theme toggle switches between dark and light', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await expect(html).not.toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(html).toHaveClass(/dark/)
})

test('saving a story adds it to bookmarks', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Save ".+" to bookmarks$/ }).first().click()
  await page.goto('/bookmarks')

  await expect(page.getByRole('heading', { name: 'Your bookmarks' })).toBeVisible()
  await expect(page.getByRole('article').first()).toBeVisible()
})

test('unknown routes render the 404 page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')
  await expect(
    page.getByRole('heading', { name: /this page took a wrong turn/i }),
  ).toBeVisible()
})

test('role guard: guest is redirected to login for protected routes', async ({ page }) => {
  await page.goto('/editor')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)editor$/)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)dashboard$/)

  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)profile$/)

  await page.goto('/admin/settings')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)admin(%2F|\/)settings$/)
})

test('role guard: subscriber cannot access editor or admin and is redirected to profile', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('subscriber')
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: 'Sam Subscriber' })).toBeVisible()

  // Attempt to enter editor
  await page.goto('/editor')
  await expect(page).toHaveURL(/\/profile$/)

  // Attempt to enter admin
  await page.goto('/admin/settings')
  await expect(page).toHaveURL(/\/profile$/)
})

test('admin can access site settings, users and comment moderation', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()

  // Admin has write_post so lands on dashboard
  await expect(page).toHaveURL(/\/dashboard$/)

  // Navigate to Admin Settings
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: 'Site Settings' })).toBeVisible()
  await expect(page.getByLabel('Site Name')).toBeVisible()

  // Navigate to Users
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'User & Role Management' })).toBeVisible()
  await expect(page.getByText('Sam Subscriber')).toBeVisible()

  // Navigate to Moderation
  await page.goto('/admin/moderation')
  await expect(page.getByRole('heading', { name: 'Comment Moderation' })).toBeVisible()
})

test('author can publish a new story in editor and view it', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('demo')
  await page.getByLabel('Password', { exact: true }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/editor')
  const title = page.getByPlaceholder(/new post title here/i)
  await expect(title).toBeVisible()
  await title.fill('Automated E2E Test Story')
  await page.locator('.tiptap').fill('This is a paragraph created during E2E testing.')

  await page.getByRole('button', { name: /options/i }).click()
  await page.getByPlaceholder(/brief summary/i).fill('This is a test excerpt created during E2E verification.')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()

  await page.getByRole('button', { name: 'Publish', exact: true }).click()

  // Redirected to single post view
  await expect(page).toHaveURL(/\/post\/automated-e2e-test-story$/)
  await expect(page.getByRole('heading', { name: 'Automated E2E Test Story' })).toBeVisible()
})
