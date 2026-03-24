import puppeteer from 'puppeteer';
import fs from 'fs';

async function inspectDOM() {
  console.log('Инспектирую Telegram Web DOM...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const url = 'https://web.telegram.org/k/#@podonki_official';
  console.log(`Загружаю: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Скролим один раз
  await page.evaluate(() => {
    const container = document.querySelector('[class*="scrollable"]') || document.querySelector('main') || document.body;
    if (container) container.scrollTop += window.innerHeight * 5;
  });

  await new Promise(r => setTimeout(r, 2000));

  // Собираем HTML структуру
  const structure = await page.evaluate(() => {
    const info = {
      allElements: document.querySelectorAll('*').length,
      classList: {},
      sampleHTML: ''
    };

    // Ищем элементы с text контентом
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 20 && text.length < 500 && !text.includes('ебера')) {
        const cls = el.className;
        if (cls) {
          info.classList[cls.substring(0, 50)] = (info.classList[cls.substring(0, 50)] || 0) + 1;
        }
      }
    });

    // Берём первый контейнер с большим текстом
    const messageContainers = document.querySelectorAll('[class*="message"], [class*="bubble"], [class*="item"]');
    if (messageContainers.length > 0) {
      info.sampleHTML = messageContainers[0].outerHTML.substring(0, 1000);
    }

    return info;
  });

  console.log('\n📊 DOM структура:');
  console.log(`Всего элементов: ${structure.allElements}`);
  console.log('\n🏷️  Top классы (content > 20 символов):');
  Object.entries(structure.classList)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cls, count]) => {
      console.log(`  ${cls.substring(0, 40)}: ${count} элементов`);
    });

  console.log('\n📄 Sample HTML:');
  console.log(structure.sampleHTML);

  // Сохраняем полный HTML для анализа
  const html = await page.content();
  fs.writeFileSync('tg-page-dump.html', html, 'utf-8');
  console.log('\n💾 Полный HTML сохранён в tg-page-dump.html');

  await browser.close();
}

inspectDOM().catch(console.error);
