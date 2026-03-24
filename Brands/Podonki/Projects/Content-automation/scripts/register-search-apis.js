import { chromium } from 'playwright'

const EMAIL = 'fr3shsmoke@gmail.com'
const PASSWORD = 'k2SkcUk1t01ZMm2L'
const USERNAME = 'fr3shsmoke'
const FIRST_NAME = 'Alex'
const LAST_NAME = 'Volkov'
const COMPANY = 'Freelance'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

// === Человеческое поведение ===

function randomDelay(min = 50, max = 200) {
  return Math.floor(Math.random() * (max - min) + min)
}

async function humanType(page, selector, text) {
  const el = page.locator(selector).first()
  if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return false

  await el.click()
  await page.waitForTimeout(randomDelay(300, 800))

  // Иногда начинаем печатать и стираем — как будто ошиблись
  const shouldMistake = Math.random() < 0.3
  if (shouldMistake && text.length > 4) {
    const mistakeLen = Math.floor(Math.random() * 3) + 1
    const mistakeText = text.slice(0, mistakeLen) + 'x'
    for (const char of mistakeText) {
      await el.press(char === ' ' ? 'Space' : char)
      await page.waitForTimeout(randomDelay(50, 180))
    }
    await page.waitForTimeout(randomDelay(400, 900))
    // Стираем ошибку
    for (let i = 0; i < mistakeText.length; i++) {
      await el.press('Backspace')
      await page.waitForTimeout(randomDelay(30, 80))
    }
    await page.waitForTimeout(randomDelay(200, 500))
  }

  // Печатаем реальный текст с разной скоростью
  for (const char of text) {
    await el.press(char === ' ' ? 'Space' : char === '@' ? '@' : char)
    await page.waitForTimeout(randomDelay(40, 160))
    // Иногда пауза подлиннее — как будто думаем
    if (Math.random() < 0.1) {
      await page.waitForTimeout(randomDelay(300, 700))
    }
  }

  await page.waitForTimeout(randomDelay(200, 600))
  return true
}

async function humanClick(page, selector) {
  try {
    const el = page.locator(selector).first()
    if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return false
    // Подводим мышь с небольшой задержкой
    await el.hover()
    await page.waitForTimeout(randomDelay(200, 500))
    await el.click()
    return true
  } catch {
    return false
  }
}

async function humanMoveMouse(page) {
  // Двигаем мышь случайно по странице — как человек осматривает
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(Math.random() * 800) + 100
    const y = Math.floor(Math.random() * 500) + 100
    await page.mouse.move(x, y, { steps: 10 })
    await page.waitForTimeout(randomDelay(200, 600))
  }
}

async function humanScroll(page) {
  await page.mouse.wheel(0, Math.floor(Math.random() * 200) + 50)
  await page.waitForTimeout(randomDelay(300, 800))
}

async function tryGoogleSignIn(page) {
  const selectors = [
    'button:has-text("Continue with Google")',
    'button:has-text("Sign in with Google")',
    'button:has-text("Sign up with Google")',
    'a:has-text("Continue with Google")',
    'a:has-text("Sign in with Google")',
    'button:has-text("Google")',
    'a:has-text("Google")',
    '[data-provider="google"]',
  ]
  for (const sel of selectors) {
    if (await humanClick(page, sel)) {
      console.log('    → Нажал Google Sign In')
      await page.waitForTimeout(3000)
      return true
    }
  }
  return false
}

async function tryGithubSignIn(page) {
  const selectors = [
    'button:has-text("Continue with GitHub")',
    'button:has-text("Sign in with GitHub")',
    'a:has-text("Continue with GitHub")',
    'a:has-text("GitHub")',
    '[data-provider="github"]',
  ]
  for (const sel of selectors) {
    if (await humanClick(page, sel)) {
      console.log('    → Нажал GitHub Sign In')
      await page.waitForTimeout(3000)
      return true
    }
  }
  return false
}

async function solveTurnstile(page) {
  // Cloudflare Turnstile — ждём iframe и кликаем чекбокс
  console.log('    → Ищу Cloudflare Turnstile...')
  await page.waitForTimeout(2000)

  // Turnstile живёт в iframe
  const frames = page.frames()
  for (const frame of frames) {
    const url = frame.url()
    if (url.includes('challenges.cloudflare.com') || url.includes('turnstile')) {
      console.log('    → Нашёл Turnstile iframe')
      await page.waitForTimeout(randomDelay(1000, 2000))
      // Двигаем мышь к чекбоксу
      try {
        const checkbox = frame.locator('input[type="checkbox"], .cb-lb, #cf-stage').first()
        if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
          await checkbox.click()
          console.log('    → Кликнул Turnstile чекбокс')
          await page.waitForTimeout(3000)
          return true
        }
      } catch {}

      // Альтернатива — кликнуть по body iframe
      try {
        const body = frame.locator('body').first()
        await body.click({ position: { x: 20, y: 20 } })
        console.log('    → Кликнул в Turnstile iframe')
        await page.waitForTimeout(3000)
        return true
      } catch {}
    }
  }

  // Пробуем найти по shadow DOM
  try {
    const turnstileDiv = page.locator('[id^="cf-turnstile"], .cf-turnstile').first()
    if (await turnstileDiv.isVisible({ timeout: 2000 }).catch(() => false)) {
      const box = await turnstileDiv.boundingBox()
      if (box) {
        // Кликаем в левую часть виджета где чекбокс
        await page.mouse.move(box.x + 30, box.y + box.height / 2, { steps: 15 })
        await page.waitForTimeout(randomDelay(500, 1000))
        await page.mouse.click(box.x + 30, box.y + box.height / 2)
        console.log('    → Кликнул Turnstile виджет')
        await page.waitForTimeout(3000)
        return true
      }
    }
  } catch {}

  console.log('    → Turnstile не найден или уже пройден')
  return false
}

async function fillForm(page) {
  await humanMoveMouse(page)
  await page.waitForTimeout(randomDelay(500, 1500))

  // Email
  const emailFilled =
    (await humanType(page, 'input[name="email"]', EMAIL)) ||
    (await humanType(page, 'input[type="email"]', EMAIL)) ||
    (await humanType(page, 'input[placeholder*="email" i]', EMAIL))

  await page.waitForTimeout(randomDelay(300, 800))

  // Password
  const passFilled =
    (await humanType(page, 'input[name="password"]', PASSWORD)) ||
    (await humanType(page, 'input[type="password"]', PASSWORD))

  // Password confirm
  await humanType(page, 'input[name="password_confirm"]', PASSWORD)
  await humanType(page, 'input[name="confirmPassword"]', PASSWORD)
  await humanType(page, 'input[name="password2"]', PASSWORD)

  await page.waitForTimeout(randomDelay(200, 600))

  // Username
  await humanType(page, 'input[name="username"]', USERNAME)

  // Names
  await humanType(page, 'input[name="firstName"]', FIRST_NAME)
  await humanType(page, 'input[name="first_name"]', FIRST_NAME)
  await humanType(page, 'input[name="lastName"]', LAST_NAME)
  await humanType(page, 'input[name="last_name"]', LAST_NAME)
  await humanType(page, 'input[name="name"]', `${FIRST_NAME} ${LAST_NAME}`)
  await humanType(page, 'input[placeholder*="your name" i]', `${FIRST_NAME} ${LAST_NAME}`)
  await humanType(page, 'input[placeholder*="full name" i]', `${FIRST_NAME} ${LAST_NAME}`)

  // Company
  await humanType(page, 'input[name="company"]', COMPANY)
  await humanType(page, 'input[name="organization"]', COMPANY)

  // Checkboxes
  const checkboxes = page.locator('input[type="checkbox"]')
  const count = await checkboxes.count()
  for (let i = 0; i < count; i++) {
    try {
      const cb = checkboxes.nth(i)
      if (await cb.isVisible() && !(await cb.isChecked())) {
        await page.waitForTimeout(randomDelay(300, 700))
        await cb.check()
      }
    } catch {}
  }

  await humanScroll(page)
  return emailFilled || passFilled
}

async function submitForm(page) {
  await page.waitForTimeout(randomDelay(500, 1200))
  const submitted =
    (await humanClick(page, 'button[type="submit"]')) ||
    (await humanClick(page, 'button:has-text("Sign up")')) ||
    (await humanClick(page, 'button:has-text("Register")')) ||
    (await humanClick(page, 'button:has-text("Create")')) ||
    (await humanClick(page, 'button:has-text("Create Account")')) ||
    (await humanClick(page, 'button:has-text("Join")')) ||
    (await humanClick(page, 'button:has-text("Get started")')) ||
    (await humanClick(page, 'button:has-text("Continue")'))
  return submitted
}

// === Регистрация на каждом сервисе ===

async function registerService(browser, name, url) {
  console.log(`\n========== ${name} ==========`)
  const page = await browser.newPage()
  try {
    await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))

    // Проверяем Turnstile/Cloudflare
    await solveTurnstile(page)
    await page.waitForTimeout(1000)

    // Двигаем мышь как человек
    await humanMoveMouse(page)

    // Пробуем Google → GitHub → форма
    let done = await tryGoogleSignIn(page)
    if (!done) done = await tryGithubSignIn(page)

    if (!done) {
      const filled = await fillForm(page)
      if (filled) {
        console.log(`  ${name}: форма заполнена`)
        await solveTurnstile(page)
        const submitted = await submitForm(page)
        if (submitted) {
          console.log(`  ${name}: форма отправлена`)
        } else {
          console.log(`  ${name}: не нашёл кнопку Submit`)
        }
      } else {
        console.log(`  ${name}: не нашёл поля формы`)
      }
    }

    await page.waitForTimeout(3000)
    console.log(`  ${name}: готово, проверь вкладку`)
  } catch (e) {
    console.log(`  ${name} ошибка: ${e.message.slice(0, 100)}`)
  }
  return page
}

async function main() {
  console.log('Запускаю Chrome (отдельный профиль)...\n')

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

  console.log('Chrome запущен!\n')

  const services = [
    ['Exa.ai', 'https://dashboard.exa.ai/login'],
    ['Serper.dev', 'https://serper.dev/signup'],
    ['Firecrawl', 'https://www.firecrawl.dev/signin'],
    ['VirusTotal', 'https://www.virustotal.com/gui/join-us'],
    ['Shodan', 'https://account.shodan.io/register'],
    ['Censys', 'https://search.censys.io/register'],
  ]

  for (const [name, url] of services) {
    await registerService(browser, name, url)
    // Пауза между сервисами — как человек
    await browser.pages()[0]?.waitForTimeout(randomDelay(2000, 4000))
  }

  console.log('\n==========================================')
  console.log('Все 6 сервисов обработаны!')
  console.log('Проверь вкладки, пройди капчу если осталась.')
  console.log('Подтверди email на почте fr3shsmoke@gmail.com')
  console.log('Скинь мне API ключи когда будут готовы.')
  console.log('==========================================')
  console.log('\nCtrl+C когда закончишь.\n')

  await new Promise(() => {})
}

main().catch(console.error)
