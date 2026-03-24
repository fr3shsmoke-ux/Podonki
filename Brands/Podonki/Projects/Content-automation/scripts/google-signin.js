import { chromium } from 'playwright'

const PROFILE_DIR = process.env.LOCALAPPDATA + '\\Playwright\\GoogleProfile'

function rd(min = 300, max = 800) {
  return Math.floor(Math.random() * (max - min) + min)
}

async function clickGoogle(page, name) {
  const selectors = [
    'button:has-text("Continue with Google")',
    'button:has-text("Sign in with Google")',
    'button:has-text("Sign up with Google")',
    'a:has-text("Continue with Google")',
    'a:has-text("Sign in with Google")',
    'a:has-text("Sign up with Google")',
    'button:has-text("Google")',
    'a:has-text("Google")',
  ]
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 })) {
        await el.hover()
        await page.waitForTimeout(rd(300, 600))
        await el.click()
        console.log(`  ${name}: нажал Google Sign In ✓`)
        return true
      }
    } catch {}
  }
  console.log(`  ${name}: Google кнопка не найдена`)
  return false
}

async function main() {
  const step = process.argv[2] || 'login'

  console.log(`Шаг: ${step}\n`)

  const browser = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
    viewport: null,
  })

  if (step === 'login') {
    // Шаг 1: открываем Google для логина
    console.log('Открываю Google — залогинься в свой аккаунт.')
    console.log('После логина закрой браузер и запусти скрипт заново с аргументом "register"\n')
    console.log('  node scripts/google-signin.js register\n')
    const page = await browser.newPage()
    await page.goto('https://accounts.google.com', { timeout: 30000 })
    await new Promise(() => {})

  } else if (step === 'register') {
    // Шаг 2: Google уже залогинен, жмём Sign In на сервисах
    const services = [
      { name: 'Exa.ai', url: 'https://dashboard.exa.ai/login' },
      { name: 'Firecrawl', url: 'https://www.firecrawl.dev/signin' },
      { name: 'Serper.dev', url: 'https://serper.dev/signup' },
      { name: 'VirusTotal', url: 'https://www.virustotal.com/gui/join-us' },
      { name: 'Shodan', url: 'https://account.shodan.io/register' },
      { name: 'Censys', url: 'https://search.censys.io/register' },
    ]

    for (const svc of services) {
      console.log(`\n=== ${svc.name} ===`)
      const page = await browser.newPage()
      await page.goto(svc.url, { timeout: 30000, waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(rd(2000, 4000))
      const found = await clickGoogle(page, svc.name)
      if (found) {
        await page.waitForTimeout(5000)
        console.log(`  URL после: ${page.url()}`)
      } else {
        console.log(`  Открыта для ручной регистрации`)
      }
    }

    console.log('\n=== Готово! Проверь вкладки. ===')
    console.log('Ctrl+C когда закончишь.\n')
    await new Promise(() => {})
  }
}

main().catch(console.error)
