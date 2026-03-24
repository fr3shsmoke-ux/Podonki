#!/usr/bin/env node

/**
 * Глубокая лингвистическая аналитика Podonki OFF
 * Анализ лексики, структуры, синтаксиса всех 192 постов
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function analyzeTexts() {
  const analysisPath = path.join(__dirname, '../data/podonki-off-analysis.json');
  const data = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  const posts = data.posts;

  console.log('\n🔬 ГЛУБОКАЯ ЛИНГВИСТИЧЕСКАЯ АНАЛИТИКА PODONKI OFF\n');
  console.log('═'.repeat(80));

  // 1. ДЛИНА ПОСТОВ
  console.log('\n📏 ДЛИНА ПОСТОВ\n');
  const lengths = posts.map(p => p.text.length);
  const avgLength = (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(0);
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  console.log(`  Средняя длина: ${avgLength} символов`);
  console.log(`  Минимум: ${minLength} символов`);
  console.log(`  Максимум: ${maxLength} символов`);

  const shortPosts = posts.filter(p => p.text.length < 100).length;
  const mediumPosts = posts.filter(p => p.text.length >= 100 && p.text.length < 300).length;
  const longPosts = posts.filter(p => p.text.length >= 300).length;
  console.log(`  Короткие (<100): ${shortPosts} постов (${(shortPosts/posts.length*100).toFixed(1)}%)`);
  console.log(`  Средние (100-300): ${mediumPosts} постов (${(mediumPosts/posts.length*100).toFixed(1)}%)`);
  console.log(`  Длинные (>300): ${longPosts} постов (${(longPosts/posts.length*100).toFixed(1)}%)`);

  // 2. ЧАСТОТНОСТЬ СЛОВ (без стоп-слов)
  console.log('\n\n📚 ТОП 50 СЛОВ\n');
  const allText = posts.map(p => p.text.toLowerCase()).join(' ');

  // Извлечение слов (только русские и английские, без цифр)
  const words = allText.match(/[а-яёa-z]+/gi) || [];

  // Стоп-слова
  const stopWords = new Set([
    'и', 'в', 'на', 'из', 'с', 'по', 'у', 'к', 'о', 'а', 'не', 'что', 'это',
    'для', 'от', 'до', 'как', 'об', 'или', 'то', 'так', 'же', 'ж',
    'the', 'a', 'an', 'and', 'or', 'is', 'are', 'be', 'of', 'to', 'in', 'on', 'at'
  ]);

  const wordFreq = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 2) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  topWords.forEach(([word, count], i) => {
    console.log(`  ${i + 1}. "${word}" — ${count} раз`);
  });

  // 3. ЭМОДЗИ АНАЛИЗ
  console.log('\n\n😐 АНАЛИЗ ЭМОДЗИ\n');
  const emojiRegex = /[\p{Emoji}]/gu;
  const allEmojis = [];
  posts.forEach(post => {
    const emojis = post.text.match(emojiRegex) || [];
    allEmojis.push(...emojis);
  });

  const emojiFreq = {};
  allEmojis.forEach(emoji => {
    emojiFreq[emoji] = (emojiFreq[emoji] || 0) + 1;
  });

  const topEmojis = Object.entries(emojiFreq).sort((a, b) => b[1] - a[1]);
  console.log(`  Всего уникальных эмодзи: ${topEmojis.length}\n`);

  topEmojis.slice(0, 25).forEach(([emoji, count], i) => {
    console.log(`  ${i + 1}. ${emoji} — ${count} раз`);
  });

  // 4. СИНТАКСИС И СТРУКТУРА
  console.log('\n\n🏗️ СИНТАКСИС И СТРУКТУРА\n');

  let postsWithBullets = 0;
  let postsWithEmojiBullets = 0;
  let postsWithNumbers = 0;
  let postsWithQuotes = 0;
  let postsWithCapsLock = 0;
  let postsWithLineBreaks = 0;
  let postsWithMentions = 0;

  posts.forEach(post => {
    if (post.text.includes('•') || post.text.includes('-') || post.text.includes('➖') || post.text.includes('→')) {
      postsWithBullets++;
    }
    if (/[⚡️❗️⚠️🔤]/u.test(post.text)) {
      postsWithEmojiBullets++;
    }
    if (/\d{1,2}\./g.test(post.text)) {
      postsWithNumbers++;
    }
    if (/[«"]/g.test(post.text)) {
      postsWithQuotes++;
    }
    if (/[А-Я]{5,}/g.test(post.text)) {
      postsWithCapsLock++;
    }
    if (post.text.split('\n').length > 3) {
      postsWithLineBreaks++;
    }
    if (/@/g.test(post.text)) {
      postsWithMentions++;
    }
  });

  console.log(`  Посты со списками (•, -, ➖): ${postsWithBullets} (${(postsWithBullets/posts.length*100).toFixed(1)}%)`);
  console.log(`  Посты с emoji-маркерами (⚡️, ❗️, etc): ${postsWithEmojiBullets} (${(postsWithEmojiBullets/posts.length*100).toFixed(1)}%)`);
  console.log(`  Посты с нумерованными пунктами: ${postsWithNumbers} (${(postsWithNumbers/posts.length*100).toFixed(1)}%)`);
  console.log(`  Посты с кавычками/кириллицей: ${postsWithQuotes} (${(postsWithQuotes/posts.length*100).toFixed(1)}%)`);
  console.log(`  Посты с CAPS LOCK: ${postsWithCapsLock} (${(postsWithCapsLock/posts.length*100).toFixed(1)}%)`);
  console.log(`  Посты с переносами строк (3+): ${postsWithLineBreaks} (${(postsWithLineBreaks/posts.length*100).toFixed(1)}%)`);
  console.log(`  Посты с @mentions: ${postsWithMentions} (${(postsWithMentions/posts.length*100).toFixed(1)}%)`);

  // 5. ХАРАКТЕРНЫЕ ФРАЗЫ И ВЫРАЖЕНИЯ
  console.log('\n\n💬 ХАРАКТЕРНЫЕ ФРАЗЫ И ВЫРАЖЕНИЯ\n');

  const phrases = {
    'only white products': 0,
    'full белый продукт': 0,
    'отгружаем': 0,
    'доступно': 0,
    'полный пакет': 0,
    'документ': 0,
    'набираем дистрибьютор': 0,
    'мы предоставляем': 0,
    'по вопросам': 0,
    'менеджер': 0,
    'качественно': 0,
    'вкусно': 0,
    'не дорого': 0,
    'маркетинговая поддержка': 0,
    'гарантия': 0,
    'розыгрыш': 0,
    'кешбек': 0,
    'акция': 0,
    'новинка': 0,
    'soon': 0,
    'sold out': 0,
    'ждем': 0
  };

  const allTextLower = allText.toLowerCase();
  Object.keys(phrases).forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    const matches = allTextLower.match(regex) || [];
    phrases[phrase] = matches.length;
  });

  Object.entries(phrases)
    .sort((a, b) => b[1] - a[1])
    .forEach(([phrase, count]) => {
      if (count > 0) {
        console.log(`  "${phrase}" — ${count} раз`);
      }
    });

  // 6. ТОНАЛЬНОСТЬ И ЭМОЦИОНАЛЬНОСТЬ
  console.log('\n\n😊 ТОНАЛЬНОСТЬ И ЭМОЦИОНАЛЬНОСТЬ\n');

  const emotionalWords = {
    'качественно': 0,
    'вкусно': 0,
    'красиво': 0,
    'отлично': 0,
    'супер': 0,
    'огромный': 0,
    'мега': 0,
    'умопомрачительный': 0,
    'уникальный': 0,
    'революционный': 0,
    'инновационный': 0,
    'спасибо': 0,
    'благодар': 0,
    'извин': 0,
    'сожал': 0
  };

  Object.keys(emotionalWords).forEach(word => {
    const regex = new RegExp(word, 'gi');
    const matches = allTextLower.match(regex) || [];
    emotionalWords[word] = matches.length;
  });

  console.log('  Позитивная лексика:');
  Object.entries(emotionalWords)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .forEach(([word, count]) => {
      console.log(`    "${word}" — ${count} раз`);
    });

  // 7. ВОПРОСЫ И CTA
  console.log('\n\n❓ CALL-TO-ACTION И ВОПРОСЫ\n');

  let questionsCount = posts.filter(p => p.text.includes('?')).length;
  let mentionsCount = posts.filter(p => p.text.includes('@')).length;
  let linksCount = posts.filter(p => p.text.includes('http')).length;
  let urgencyCount = posts.filter(p => /скоро|soon|ждем|ждём/gi.test(p.text)).length;
  let exclusivityCount = posts.filter(p => /только|limited|exclusive/gi.test(p.text)).length;

  console.log(`  Вопросы: ${questionsCount} постов (${(questionsCount/posts.length*100).toFixed(1)}%)`);
  console.log(`  @mentions (менеджеры, каналы): ${mentionsCount} постов (${(mentionsCount/posts.length*100).toFixed(1)}%)`);
  console.log(`  Ссылки: ${linksCount} постов (${(linksCount/posts.length*100).toFixed(1)}%)`);
  console.log(`  Срочность (скоро, ждем): ${urgencyCount} постов (${(urgencyCount/posts.length*100).toFixed(1)}%)`);
  console.log(`  Эксклюзивность (только, limited): ${exclusivityCount} постов (${(exclusivityCount/posts.length*100).toFixed(1)}%)`);

  // 8. СРАВНЕНИЕ ПЕРВОЙ И ВТОРОЙ ПОЛОВИНЫ (ЭВОЛЮЦИЯ)
  console.log('\n\n📈 ЭВОЛЮЦИЯ КОНТЕНТА (Первая vs Вторая половина)\n');

  const firstHalf = posts.slice(0, Math.floor(posts.length / 2));
  const secondHalf = posts.slice(Math.floor(posts.length / 2));

  const analyzeHalf = (half, name) => {
    const avgLen = (half.reduce((a, b) => a + b.text.length, 0) / half.length).toFixed(0);
    const withEmoji = half.filter(p => /[\p{Emoji}]/u.test(p.text)).length;
    const avgEmojis = (half.reduce((a, b) => {
      const m = b.text.match(/[\p{Emoji}]/gu) || [];
      return a + m.length;
    }, 0) / half.length).toFixed(1);

    console.log(`  ${name}:`);
    console.log(`    Средняя длина: ${avgLen} символов`);
    console.log(`    Посты с эмодзи: ${withEmoji} (${(withEmoji/half.length*100).toFixed(1)}%)`);
    console.log(`    Среднее кол-во эмодзи: ${avgEmojis} на пост`);
  };

  analyzeHalf(firstHalf, 'Первая половина (апрель-август 2024)');
  analyzeHalf(secondHalf, 'Вторая половина (август 2024 - февраль 2025)');

  console.log('\n' + '═'.repeat(80));

  // Сохранить полный анализ
  const outputPath = path.join(__dirname, '../data/podonki-off-linguistic-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    totalPosts: posts.length,
    length: {
      avg: avgLength,
      min: minLength,
      max: maxLength,
      distribution: { short: shortPosts, medium: mediumPosts, long: longPosts }
    },
    topWords: topWords.slice(0, 50),
    topEmojis: topEmojis.slice(0, 25),
    syntax: {
      bulletsWithMarkers: postsWithBullets,
      emojiMarkers: postsWithEmojiBullets,
      numberedLists: postsWithNumbers,
      quotes: postsWithQuotes,
      capsLock: postsWithCapsLock,
      lineBreaks: postsWithLineBreaks,
      mentions: postsWithMentions
    },
    commonPhrases: Object.entries(phrases).filter(([, count]) => count > 0),
    emotionalWords: Object.entries(emotionalWords).filter(([, count]) => count > 0),
    cta: {
      questions: questionsCount,
      mentions: mentionsCount,
      links: linksCount,
      urgency: urgencyCount,
      exclusivity: exclusivityCount
    }
  }, null, 2));

  console.log(`\n✅ Полный анализ сохранён: data/podonki-off-linguistic-analysis.json\n`);
}

try {
  analyzeTexts();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
