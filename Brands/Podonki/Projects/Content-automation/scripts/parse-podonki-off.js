#!/usr/bin/env node

/**
 * Парсинг экспорта Telegram канала Podonki OFF из HTML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parsePodonkiOff() {
  const htmlPath = 'C:/Users/Пох кто/OneDrive/Рабочий стол/PodonkiOFF/messages.html';
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const posts = [];

  // Парсинг всех message блоков
  const messagePattern = /<div class="message default clearfix"[^>]*id="message\d+">([\s\S]*?)(?=<div class="message|$)/g;
  let match;

  while ((match = messagePattern.exec(html)) !== null) {
    const messageHtml = match[1];

    // Парсинг даты
    const dateMatch = messageHtml.match(/title="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : 'unknown';

    // Парсинг текста - ищем содержимое <div class="text">
    const textMatch = messageHtml.match(/<div class="text">([\s\S]*?)<\/div>/);
    let text = '';
    if (textMatch) {
      text = textMatch[1]
        .replace(/<em>/g, '')
        .replace(/<\/em>/g, '')
        .replace(/<blockquote>/g, '')
        .replace(/<\/blockquote>/g, '')
        .replace(/<br>/g, '\n')
        .replace(/<br\/>/g, '\n')
        .replace(/<[^>]+>/g, '') // Удалить оставшиеся теги
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .trim();
    }

    // Парсинг реакций
    const reactions = {};
    const emojiPattern = /<span class="emoji">\s*([\s\S]*?)\s*<\/span>\s*<span class="count">(\d+)<\/span>/g;
    let emojiMatch;
    while ((emojiMatch = emojiPattern.exec(messageHtml)) !== null) {
      const emoji = emojiMatch[1].trim();
      const count = parseInt(emojiMatch[2]);
      if (emoji) {
        reactions[emoji] = count;
      }
    }

    if (text) {
      posts.push({
        date,
        text,
        reactions,
        engagementScore: Object.values(reactions).reduce((a, b) => a + b, 0)
      });
    }
  }

  return posts;
}

// Анализ постов
function analyzeContent(posts) {
  console.log('\n📺 PODONKI OFF Channel Analysis\n');
  console.log('═'.repeat(70));

  console.log(`\n📊 Total posts: ${posts.length}\n`);

  if (posts.length === 0) {
    console.log('No posts found. HTML structure may have changed.');
    return;
  }

  // Топ постов по engagement
  console.log('🔥 Top posts by engagement:\n');
  posts
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 8)
    .forEach((post, i) => {
      const preview = post.text.substring(0, 70).replace(/\n/g, ' ');
      console.log(`${i + 1}. "${preview}..."`);
      console.log(`   📅 ${post.date}`);
      console.log(`   ❤️ Engagement: ${post.engagementScore}`);
      const reactionsStr = Object.entries(post.reactions)
        .map(([k, v]) => `${k}(${v})`)
        .join(' ');
      console.log(`   ${reactionsStr}`);
      console.log('');
    });

  // Ключевые слова и фразы
  console.log('\n📝 Key phrases in posts:\n');

  const allText = posts.map(p => p.text).join(' ').toLowerCase();
  const phrases = [
    'белый продукт',
    'акциз',
    'документы',
    'декларация',
    'гтд',
    'ндс',
    'сертификат',
    'дистрибьютор',
    'регион',
    'качественный',
    'гарантия',
    'поступление',
    'мини',
    'click',
    'original',
    'swedish',
    'конструктор',
    'пакет'
  ];

  phrases.forEach(phrase => {
    const count = (allText.match(new RegExp(phrase, 'g')) || []).length;
    if (count > 0) {
      console.log(`  • "${phrase}": ${count} упоминаний`);
    }
  });

  // Emoji и их частота
  console.log('\n\n😐 Most used reactions:\n');
  const allReactions = {};
  posts.forEach(post => {
    Object.entries(post.reactions).forEach(([emoji, count]) => {
      allReactions[emoji] = (allReactions[emoji] || 0) + count;
    });
  });

  Object.entries(allReactions)
    .sort((a, b) => b[1] - a[1])
    .forEach(([emoji, count]) => {
      console.log(`  ${emoji}: ${count} reactions`);
    });

  // Частота постинга
  console.log('\n\n📅 Posts by month:\n');
  const postsByMonth = {};
  posts.forEach(post => {
    const month = post.date.substring(0, 7); // YYYY-MM
    postsByMonth[month] = (postsByMonth[month] || 0) + 1;
  });

  Object.entries(postsByMonth)
    .sort()
    .forEach(([month, count]) => {
      console.log(`  ${month}: ${count} posts`);
    });

  // Средний engagement
  const avgEngagement = (posts.reduce((a, b) => a + b.engagementScore, 0) / posts.length).toFixed(1);
  console.log(`\n📊 Average engagement per post: ${avgEngagement} reactions\n`);

  console.log('═'.repeat(70));

  // Сохранить результаты
  const outputPath = path.join(__dirname, '../data/podonki-off-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    totalPosts: posts.length,
    posts: posts,
    topReactions: Object.entries(allReactions).sort((a, b) => b[1] - a[1]),
    postsByMonth: postsByMonth,
    analysis: {
      avgEngagement: parseFloat(avgEngagement),
      topPosts: posts
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 5)
    }
  }, null, 2));

  console.log(`\n✅ Full analysis saved to: data/podonki-off-analysis.json\n`);
}

// Запуск
try {
  const posts = parsePodonkiOff();
  analyzeContent(posts);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
