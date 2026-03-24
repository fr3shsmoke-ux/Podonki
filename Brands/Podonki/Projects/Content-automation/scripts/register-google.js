import { chromium } from 'playwright'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA = process.env.LOCALAPPDATA + '\\Google\\Chrome\\User Data'

// Сервисы с Google Sign In
const googleServices = [
  { name: 'Exa.ai', url: 'https://dashboard.exa.ai/login' },
  { name: 'Firecrawl', url: 'https://www.firecrawl.dev/signin' },
]

// Сервисы без Google — форма
const formServices = [
  { name: 'Serper.dev', url: 'https://serper.dev/signup' },
  { name: 'VirusTotal', url: 'https://www.virustotal.com/gui/join-us' },
  { name: 'Shodan', url: 'https://account.shodan.io/register' },
  { name: 'Censys', url: 'https://search.censys.io/register' },
]

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
  console.log(`  ${name}: Google кнопка не найдена ✗`)
  return false
}

async function main() {
  console.log('Запускаю Chrome с твоим профилем (Google залогинен)...\n')

  const browser = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--profile-directory=Default',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    viewport: null,
  })

  // Google Sign In сервисы
  for (const svc of googleServices) {
    console.log(`\n=== ${svc.name} (Google) ===`)
    const page = await browser.newPage()
    try {
      await page.goto(svc.url, { timeout: 30000, waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(rd(2000, 3500))
      await clickGoogle(page, svc.name)
      await page.waitForTimeout(5000)
      console.log(`  ${svc.name}: текущий URL: ${page.url()}`)
    } catch (e) {
      console.log(`  ${svc.name}: ошибка — ${e.message.slice(0, 80)}`)
    }
  }

  // Формы — просто открываю, чтобы зарегать вручную потом
  for (const svc of formServices) {
    console.log(`\n=== ${svc.name} (форма) ===`)
    const page = await browser.newPage()
    try {
      await page.goto(svc.url, { timeout: 30000, waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(rd(1500, 3000))
      console.log(`  ${svc.name}: страница открыта`)
    } catch (e) {
      console.log(`  ${svc.name}: ошибка — ${e.message.slice(0, 80)}`)
    }
  }

  console.log('\n==========================================')
  console.log('Google сервисы — должны быть залогинены автоматически.')
  console.log('Формы — открыты, зарегайся вручную.')
  console.log('Ctrl+C когда закончишь.')
  console.log('==========================================\n')

  await new Promise(() => {})
}

main().catch(console.error)
