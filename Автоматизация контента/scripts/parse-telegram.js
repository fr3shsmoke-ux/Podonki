const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs');
const path = require('path');

const API_ID = 10497335;
const API_HASH = '09fb2fc7c61c928cf5515006516ec6aa';
const SESSION_FILE = path.join(__dirname, 'telegram.session');
const OUTPUT_DIR = path.join(__dirname, 'parsed-data');

// Раздели каналы по типам и категориям
const CHANNELS_CONFIG = {
  own: {
    b2b: [
      'train_lab',      // Train lab - ID: 1750155649
      'podonki_off',    // Podonki Off - ID: 1662279308
    ],
    b2c: [
      'podonki',        // Podonki B2C канал
    ],
  },
  chats: [
    'podonki',          // Чат Podonki - ID: 2522444857 (для общения AI)
  ],
  competitors: [
    'lolzteam',
    'habr_news',
    'eksployt',
  ],
};

let sessionString = '';
if (fs.existsSync(SESSION_FILE)) {
  sessionString = fs.readFileSync(SESSION_FILE, 'utf-8');
}

async function parseChannel(client, channelName, limit = 0) {
  console.log(`\n[+] Parsing all messages from @${channelName}...`);

  try {
    const entity = await client.getEntity(channelName);
    const messages = [];
    let count = 0;

    // Парсим ВСЕ сообщения если limit = 0, иначе парсим limit сообщений
    const options = limit > 0 ? { limit } : {};

    for await (const msg of client.iterMessages(entity, options)) {
      if (msg.text) {
        messages.push({
          id: msg.id,
          date: msg.date ? new Date(msg.date * 1000).toISOString() : null,
          text: msg.text,
          sender: msg.senderId || null,
          hasMedia: !!msg.media,
          isEdited: msg.isEdited,
        });
        count++;

        if (count % 100 === 0) {
          console.log(`    Processing... ${count} messages`);
        }
      }
    }

    return { success: true, messages, count };
  } catch (err) {
    console.error(`    [ERROR] ${err.message}`);
    return { success: false, messages: [], count: 0, error: err.message };
  }
}

function cleanTextForTraining(text) {
  // Удаляем служебные элементы, но сохраняем структуру
  let cleaned = text
    .replace(/✅ \*\*[^*]+\*\*/g, '') // "✅ **LOLZTEAM. Подписаться**"
    .replace(/✅/g, '')
    .replace(/⏰|📌|📊|🎯|⚡️|🆓|🎨|🧮|⭐️|#️⃣|📝|🔗/g, '') // emoji удаляем
    .trim();

  return cleaned;
}

function extractMetadata(text) {
  const metadata = {
    hasHeadline: /^\*\*/.test(text),
    hasList: /^\s*[➖\-•]/m.test(text),
    hasLink: /https?:\/\//.test(text),
    hasCode: /`[^`]+`/.test(text),
    hasBold: /\*\*[^*]+\*\*/.test(text),
    length: text.length,
    paragraphs: (text.match(/\n\n/g) || []).length + 1,
  };

  return metadata;
}

async function main() {
  console.log('[*] Initializing GramJS client...');

  const client = new TelegramClient(
    new StringSession(sessionString),
    API_ID,
    API_HASH,
    {
      connectionRetries: 5,
      baseLogger: {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    }
  );

  try {
    await client.connect();
    console.log('[+] Connected to Telegram');

    if (!await client.isUserAuthorized()) {
      console.log('[!] Not authorized. Starting sign-in...');
      const phone = await input.text('Phone number: ');
      await client.start({
        phoneNumber: async () => phone,
        password: async () => await input.text('Password (if 2FA): '),
        phoneCode: async () => await input.text('Code from SMS: '),
        onError: (err) => console.error('Auth error:', err),
      });
      console.log('[+] Authenticated successfully');
    }

    const me = await client.getMe();
    console.log(`[+] Logged in as: ${me.firstName}`);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Папки для разных типов данных
    const DATASET_DIR = path.join(OUTPUT_DIR, 'datasets');
    const TRAINING_DIR = path.join(DATASET_DIR, 'training');
    const ANALYSIS_DIR = path.join(OUTPUT_DIR, 'analysis');

    [DATASET_DIR, TRAINING_DIR, ANALYSIS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const summary = {
      timestamp: new Date().toISOString(),
      ownB2B: {},
      ownB2C: {},
      chats: {},
      competitors: {},
    };

    // Парсим свои B2B каналы
    console.log('\n' + '='.repeat(60));
    console.log('📌 PARSING OWN B2B CHANNELS');
    console.log('='.repeat(60));

    for (const channel of CHANNELS_CONFIG.own.b2b) {
      const result = await parseChannel(client, channel, 0);

      if (result.success) {
        const filename = path.join(TRAINING_DIR, `own-b2b-${channel}-full.json`);
        fs.writeFileSync(filename, JSON.stringify(result.messages, null, 2));

        const trainingData = result.messages.map(msg => ({
          text: cleanTextForTraining(msg.text),
          originalText: msg.text,
          metadata: extractMetadata(msg.text),
          date: msg.date,
          type: 'b2b',
        }));

        const trainingFile = path.join(TRAINING_DIR, `own-b2b-${channel}-training.jsonl`);
        fs.writeFileSync(
          trainingFile,
          trainingData.map(d => JSON.stringify(d)).join('\n')
        );

        summary.ownB2B[channel] = {
          totalMessages: result.count,
          file: path.relative(OUTPUT_DIR, filename),
          trainingFile: path.relative(OUTPUT_DIR, trainingFile),
        };

        console.log(`    [OK] Saved ${result.count} B2B messages from @${channel}`);
      }
    }

    // Парсим свои B2C каналы
    console.log('\n' + '='.repeat(60));
    console.log('📌 PARSING OWN B2C CHANNELS');
    console.log('='.repeat(60));

    for (const channel of CHANNELS_CONFIG.own.b2c) {
      const result = await parseChannel(client, channel, 0);

      if (result.success) {
        const filename = path.join(TRAINING_DIR, `own-b2c-${channel}-full.json`);
        fs.writeFileSync(filename, JSON.stringify(result.messages, null, 2));

        const trainingData = result.messages.map(msg => ({
          text: cleanTextForTraining(msg.text),
          originalText: msg.text,
          metadata: extractMetadata(msg.text),
          date: msg.date,
          type: 'b2c',
        }));

        const trainingFile = path.join(TRAINING_DIR, `own-b2c-${channel}-training.jsonl`);
        fs.writeFileSync(
          trainingFile,
          trainingData.map(d => JSON.stringify(d)).join('\n')
        );

        summary.ownB2C[channel] = {
          totalMessages: result.count,
          file: path.relative(OUTPUT_DIR, filename),
          trainingFile: path.relative(OUTPUT_DIR, trainingFile),
        };

        console.log(`    [OK] Saved ${result.count} B2C messages from @${channel}`);
      }
    }

    // Парсим чаты (для сбора данных AI)
    console.log('\n' + '='.repeat(60));
    console.log('💬 PARSING CHATS (FOR AI CONTEXT)');
    console.log('='.repeat(60));

    const chatsData = {};
    for (const chat of CHANNELS_CONFIG.chats) {
      const result = await parseChannel(client, chat, 0);

      if (result.success) {
        const filename = path.join(TRAINING_DIR, `chat-${chat}-full.json`);
        fs.writeFileSync(filename, JSON.stringify(result.messages, null, 2));

        // Датасет для обучения на диалогах
        const dialogData = result.messages.map(msg => ({
          text: msg.text,
          metadata: extractMetadata(msg.text),
          date: msg.date,
          type: 'chat_message',
        }));

        const dialogFile = path.join(TRAINING_DIR, `chat-${chat}-dialogs.jsonl`);
        fs.writeFileSync(
          dialogFile,
          dialogData.map(d => JSON.stringify(d)).join('\n')
        );

        chatsData[chat] = {
          totalMessages: result.count,
          file: path.relative(OUTPUT_DIR, filename),
          dialogFile: path.relative(OUTPUT_DIR, dialogFile),
        };

        console.log(`    [OK] Saved ${result.count} messages from chat @${chat}`);
      }
    }

    // Парсим конкурентов (полностью, без лимита)
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PARSING COMPETITORS');
    console.log('='.repeat(60));

    for (const channel of CHANNELS_CONFIG.competitors) {
      const result = await parseChannel(client, channel, 0); // 0 = нет лимита

      if (result.success) {
        const filename = path.join(TRAINING_DIR, `competitor-${channel}-full.json`);
        fs.writeFileSync(filename, JSON.stringify(result.messages, null, 2));

        // Подготавливаем датасет для анализа конкурентов
        const analysisData = result.messages.map(msg => ({
          text: msg.text,
          metadata: extractMetadata(msg.text),
          date: msg.date,
          ideas: extractTools(msg.text),
        }));

        const analysisFile = path.join(TRAINING_DIR, `competitor-${channel}-analysis.jsonl`);
        fs.writeFileSync(
          analysisFile,
          analysisData.map(d => JSON.stringify(d)).join('\n')
        );

        summary.competitors[channel] = {
          totalMessages: result.count,
          file: path.relative(OUTPUT_DIR, filename),
          analysisFile: path.relative(OUTPUT_DIR, analysisFile),
        };

        console.log(`    [OK] Saved ${result.count} messages from @${channel}`);
      }
    }

    // Добавляем чаты в сводку
    summary.chats = chatsData;

    // Сохраняем сводку
    const summaryFile = path.join(OUTPUT_DIR, 'parse-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('✅ PARSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Summary: ${summaryFile}`);
    console.log(`📁 Training data: ${TRAINING_DIR}`);

  } catch (err) {
    console.error('[ERROR]', err.message);
  } finally {
    await client.disconnect();
  }
}

function extractTools(text) {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const matches = [...text.matchAll(boldRegex)].map(m => m[1]);
  return [...new Set(matches)].slice(0, 5);
}

main().catch(err => console.error('[FATAL]', err.message));
