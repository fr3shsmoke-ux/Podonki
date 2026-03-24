import { chromium } from 'playwright'

const EMAIL = 'fr3shsmoke@gmail.com'
const PASSWORD = 'k2SkcUk1t01ZMm2L'
const FIRST_NAME = 'Alex'
const LAST_NAME = 'Volkov'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

function randomDelay(min = 50, max = 200) {
  return Math.floor(Math.random() * (max - min) + min)
}

async function humanType(page, selector, text) {
  const el = page.locator(selector).first()
  if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return false

  await el.click()
  await page.waitForTimeout(randomDelay(400, 900))

  // Иногда ошибаемся и стираем
  if (Math.random() < 0.25 && text.length > 3) {
    const typo = text.slice(0, 2) + 'q'
    for (const ch of typo) {
      await page.keyboard.type(ch, { delay: randomDelay(60, 150) })
    }
    await page.waitForTimeout(randomDelay(500, 1000))
    for (let i = 0; i < typo.length; i++) {
      await page.keyboard.press('Backspace')
      await page.waitForTimeout(randomDelay(30, 70))
    }
    await page.waitForTimeout(randomDelay(300, 600))
  }

  for (let i = 0; i < text.length; i++) {
    await page.keyboard.type(text[i], { delay: randomDelay(40, 140) })
    if (Math.random() < 0.08) {
      await page.waitForTimeout(randomDelay(400, 900))
    }
  }

  await page.waitForTimeout(randomDelay(300, 700))
  return true
}

async function humanClick(page, selector) {
  try {
    const el = page.locator(selector).first()
    if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return false
    await el.hover()
    await page.waitForTimeout(randomDelay(200, 500))
    await el.click()
    return true
  } catch { return false }
}

async function solveTurnstile(page) {
  console.log('  → Ищу Turnstile...')
  await page.waitForTimeout(2000)

  // Ищем iframe Cloudflare
  const frames = page.frames()
  for (const frame of frames) {
    if (frame.url().includes('challenges.cloudflare.com') || frame.url().includes('turnstile')) {
      console.log('  → Нашёл Turnstile iframe')
      await page.waitForTimeout(randomDelay(1000, 2000))
      try {
        // Кликаем по чекбоксу внутри iframe
        const body = frame.locator('body').first()
        const box = await body.boundingBox()
        if (box) {
          await page.mouse.move(box.x + 25, box.y + 15, { steps: 15 })
          await page.waitForTimeout(randomDelay(300, 700))
          await page.mouse.click(box.x + 25, box.y + 15)
          console.log('  → Кликнул в Turnstile чекбокс')
          await page.waitForTimeout(4000)
          return true
        }
      } catch (e) {
        console.log('  → Turnstile клик не удался:', e.message.slice(0, 50))
      }
    }
  }

  // Пробуем через div-обёртку
  try {
    const turnstile = page.locator('[id*="turnstile"], .cf-turnstile, iframe[src*="cloudflare"]').first()
    if (await turnstile.isVisible({ timeout: 2000 }).catch(() => false)) {
      const box = await turnstile.boundingBox()
      if (box) {
        await page.mouse.move(box.x + 25, box.y + box.height / 2, { steps: 15 })
        await page.waitForTimeout(randomDelay(500, 1000))
        await page.mouse.click(box.x + 25, box.y + box.height / 2)
        console.log('  → Кликнул Turnstile виджет')
        await page.waitForTimeout(4000)
        return true
      }
    }
  } catch {}

  console.log('  → Turnstile не найден')
  return false
}

async function main() {
  console.log('Запускаю Chrome — Serper.dev регистрация...\n')

  const TEMP_PROFILE = process.env.LOCALAPPDATA + '\\Google\\Chrome\\User Data MCP'
  const browser = await chromium.launchPersistentContext(TEMP_PROFILE, {
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    viewport: { width: 1280, height: 800 },
  })

  const page = (await browser.pages())[0] || await browser.newPage()
  await page.goto('https://serper.dev/signup', { timeout: 30000, waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(randomDelay(2500, 4000))

  // Двигаем мышь — осматриваем страницу
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(
      Math.floor(Math.random() * 600) + 300,
      Math.floor(Math.random() * 300) + 150,
      { steps: randomDelay(10, 20) }
    )
    await page.waitForTimeout(randomDelay(400, 800))
  }

  console.log('→ Заполняю форму...\n')

  // 1. First Name — поле с placeholder "First"
  const firstOk =
    (await humanType(page, 'input[placeholder="First"]', FIRST_NAME)) ||
    (await humanType(page, 'input[name="firstName"]', FIRST_NAME)) ||
    (await humanType(page, 'input[name="first_name"]', FIRST_NAME)) ||
    (await humanType(page, 'input[name="first"]', FIRST_NAME))
  console.log(`  First Name: ${firstOk ? FIRST_NAME + ' ✓' : '✗'}`)

  await page.waitForTimeout(randomDelay(500, 1000))

  // 2. Last Name — поле с placeholder "Last"
  const lastOk =
    (await humanType(page, 'input[placeholder="Last"]', LAST_NAME)) ||
    (await humanType(page, 'input[name="lastName"]', LAST_NAME)) ||
    (await humanType(page, 'input[name="last_name"]', LAST_NAME)) ||
    (await humanType(page, 'input[name="last"]', LAST_NAME))
  console.log(`  Last Name: ${lastOk ? LAST_NAME + ' ✓' : '✗'}`)

  await page.waitForTimeout(randomDelay(500, 1000))

  // 3. Email
  const emailOk =
    (await humanType(page, 'input[type="email"]', EMAIL)) ||
    (await humanType(page, 'input[name="email"]', EMAIL)) ||
    (await humanType(page, 'input[placeholder*="email" i]', EMAIL))
  console.log(`  Email: ${emailOk ? EMAIL + ' ✓' : '✗'}`)

  await page.waitForTimeout(randomDelay(500, 1000))

  // 4. Password
  const passOk =
    (await humanType(page, 'input[type="password"]', PASSWORD)) ||
    (await humanType(page, 'input[name="password"]', PASSWORD))
  console.log(`  Password: ${passOk ? '●●●●●●● ✓' : '✗'}`)

  // Скролл к капче
  await page.mouse.wheel(0, 100)
  await page.waitForTimeout(randomDelay(800, 1500))

  // 5. Turnstile капча
  await solveTurnstile(page)

  // 6. Create account
  await page.waitForTimeout(randomDelay(1000, 2000))
  const submitted =
    (await humanClick(page, 'button:has-text("Create account")')) ||
    (await humanClick(page, 'button[type="submit"]'))
  console.log(`  Submit: ${submitted ? 'нажат ✓' : '✗'}`)

  await page.waitForTimeout(4000)

  // Скриншот
  await page.screenshot({ path: 'scripts/serper-result.png' })
  console.log('\n=== Скриншот: scripts/serper-result.png ===')
  console.log('Ctrl+C когда закончишь.\n')

  await new Promise(() => {})
}

main().catch(console.error)
