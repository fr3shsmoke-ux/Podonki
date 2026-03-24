import puppeteer from 'puppeteer'

const CHANNELS = [
  { name: 'Podonki (b2c)', url: 'https://web.telegram.org/k/#-1001662279308' },
  // Добавь остальные 2 канала
]

async function parseChannel(url) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    console.log('✓ Канал загружен. Жди загрузку постов...')

    // Скролим вниз чтобы загрузить все посты
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 10)
    })

    await new Promise(r => setTimeout(r, 2000))

    // Вытаскиваем все тексты
    const posts = await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="message"]')
      const texts = []
      messages.forEach(msg => {
        const text = msg.innerText?.trim()
        if (text && text.length > 10) texts.push(text)
      })
      return texts
    })

    console.log(`\n📄 Найдено ${posts.length} постов:\n`)
    posts.forEach((post, i) => {
      console.log(`--- ПОСТ ${i + 1} ---`)
      console.log(post)
      console.log()
    })

    return posts
  } finally {
    await browser.close()
  }
}

async function main() {
  for (const channel of CHANNELS) {
    console.log(`\n📢 Парсю: ${channel.name}`)
    await parseChannel(channel.url)
  }
}

main().catch(console.error)
