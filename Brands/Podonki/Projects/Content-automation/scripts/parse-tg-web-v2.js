import puppeteer from 'puppeteer';
import fs from 'fs';

// Каналы для парсинга (через web.telegram.org)
const CHANNELS = [
  { name: 'Podonki', username: 'podonki_official', id: '@podonki_official' },
  { name: 'Random Beast', username: 'random_beast', id: '@random_beast' },
  { name: 'Catswill', username: 'catswill_vape', id: '@catswill_vape' }
];

async function parseChannel(channelId) {
  console.log(`\n📢 Парсю канал: ${channelId}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Переходим на канал
    const url = `https://web.telegram.org/k/#${channelId}`;
    console.log(`  🔗 Загружаю: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000)); // Даём время на загрузку

    // Скролим вниз для загрузки всех сообщений
    console.log('  ⬇️  Скролю для загрузки постов...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const messageList = document.querySelector('[class*="scrollable"]');
        if (messageList) messageList.scrollTop += window.innerHeight;
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // Ищем все сообщения - новый селектор для Telegram Web K
    const posts = await page.evaluate(() => {
      const messages = [];

      // Селектор 1: основные контейнеры сообщений
      const messageElements = document.querySelectorAll('[class*="message"]');

      messageElements.forEach(elem => {
        const text = elem.innerText?.trim();
        if (text && text.length > 10) {
          // Фильтруем служебные сообщения
          if (!text.includes('has pinned') && !text.includes('member') && !text.includes('joined')) {
            messages.push({
              text: text,
              timestamp: new Date().toISOString(),
              length: text.length
            });
          }
        }
      });

      // Селектор 2: альтернативный поиск через data-атрибуты
      if (messages.length === 0) {
        const bubbles = document.querySelectorAll('[class*="bubble"]');
        bubbles.forEach(bubble => {
          const text = bubble.innerText?.trim();
          if (text && text.length > 10) {
            messages.push({
              text: text,
              timestamp: new Date().toISOString(),
              length: text.length
            });
          }
        });
      }

      return messages;
    });

    console.log(`  ✅ Найдено ${posts.length} постов`);
    return posts;

  } catch (error) {
    console.error(`  ❌ Ошибка: ${error.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  TELEGRAM WEB PARSER V2');
  console.log('='.repeat(60));

  const allPosts = [];

  for (const channel of CHANNELS) {
    const posts = await parseChannel(channel.id);
    allPosts.push({
      channel: channel.name,
      username: channel.username,
      posts: posts
    });
  }

  // Сохраняем результат
  const outputFile = 'posts-data.json';
  fs.writeFileSync(outputFile, JSON.stringify(allPosts, null, 2), 'utf-8');

  console.log(`\n✅ Сохранено в ${outputFile}`);
  console.log(`📊 Всего постов: ${allPosts.reduce((sum, ch) => sum + ch.posts.length, 0)}`);
}

main().catch(console.error);
