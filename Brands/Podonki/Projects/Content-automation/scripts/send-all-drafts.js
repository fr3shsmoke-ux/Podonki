import https from 'https'
import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const TOKEN = '8656548869:AAG7-MGcZVOaEoFhfGtlR8AHDmZx5YrsDNs'
const CHAT = '358580133'
const BASE = 'c:/Users/Пох кто/OneDrive/Рабочий стол/Projects/Podonki/Projects/Content-automation/Материалы'

const posts = [
  {
    name: 'Podonki Podgon',
    caption: `<i>25 вкусов за копейки – серьёзно?

Ага. <b>Podonki Podgon</b> – бюджетка, которая не стыдно парить

Фрукты, ягоды, напитки – 25 штук, и каждый на уровне. Крепкость 30 мг, мягко заходит

Не надо переплачивать, чтобы получить нормальный вкус. Тут это доказали

С какого начнёшь?</i>`,
    image: null
  },
  {
    name: 'Podonki Last Hap',
    caption: `<i>40 вкусов. Сорок. Не опечатка

<b>Podonki Last Hap</b> – когда перепробовал всё и думал, что удивить уже нечем

Концентрация ароматизаторов x2 – вкус бьёт с первой затяжки и не отпускает. Лимонады, экзотика, крем, табак – тут реально есть всё

Каждый вкус разрабатывали отдельно, а не просто меняли ароматизатор

Сколько из 40 ты уже попробовал?</i>`,
    image: null
  },
  {
    name: 'Podonki x Hotspot – Resonance',
    caption: `<i>Утром заряд. Днём свежесть. Вечером уют

<b>Podonki x Hotspot – Resonance</b> – выбираешь не по вкусу, а по настроению

SODA – газированный удар, когда нужна энергия
FRESH – ледяная мята, когда голова кипит
GELATO – кремовый десерт, когда хочется расслабиться

15 вкусов, 3 состояния. Какое у тебя сейчас?</i>`,
    image: null
  },
  {
    name: 'Podonki Light',
    caption: `<i>Не все любят, когда бьёт по горлу

<b>Podonki Light</b> – 20 мг, мягко и со вкусом. Для тех, кто парит часто и не хочет перегружать рецепторы

15 вкусов: манго-маракуйя, арбуз-мята, черничный йогурт... Вкус раскрывается плавно, без резкого удара

Комфорт на весь день. Не экстрим, а удовольствие

Кто уже перешёл на лёгкую?</i>`,
    image: `${BASE}/Канал Train lab/Жидкости/Podonki Light/Готовые картинки/IMG_5558.png`
  },
  {
    name: 'Podonki Sour',
    caption: `<i>Кислое – не для слабых

<b>Podonki Sour</b> – 20 вкусов, которые реально будят. Без сладкой маскировки, чистая кислота с первой затяжки

Кислый виноград, мармелад, мохито, морс... Рецепторы скажут спасибо

Вкус, который невозможно спутать с другим. Попробовал – запомнил – вернулся

Самый кислый из 20 – какой?</i>`,
    image: null
  },
  {
    name: 'Podonki x Isterika',
    caption: `<i>Кислые червячки в вишне. Виноградный чупа-чупс. Ананасовая шипучка

Не меню детского кафе – это <b>Podonki x Isterika</b>

15 вкусов с ностальгией из детства и неожиданным финалом. Крепкость на пределе

А упаковка – граффити-арт, который хочется собирать. Каждая шайба с разным дизайном

Какой вкус из детства ты бы засунул в жидкость?</i>`,
    image: null
  },
  {
    name: 'Podonki Critical (liquid)',
    caption: `<i>60 мг. Выше почти никто не делает

<b>Podonki Critical</b> – для тех, кому 50 мало. 15 вкусов от мяты до тропиков, крепкость на максимум

Когда нашёл свою крепость – на другое уже не переходишь

Осторожно: это не для новичков

Кто парит 60 и не морщится?</i>`,
    image: `${BASE}/Канал Train lab/Жидкости/Podonki Critical/Готовые картинки/photo_2025-11-07_20-28-35.jpg`
  },
  {
    name: 'Podonki x Malasian',
    caption: `<i>Упаковку увидел – руки сами потянулись

<b>Podonki x Malasian</b> – 12 экзотических миксов. Тропические фрукты, candy-профили, малайзийская палитра

Дизайн не похож ни на что на полке. Берёшь глазами ещё до того, как попробуешь

А потом попробовал – и понял, что внутри не хуже

Собрал всю коллекцию?</i>`,
    image: null
  },
  {
    name: 'Podonki Slick',
    caption: `<i>150 мг, 27 паучей, slim-формат. Без маркетинговых сказок

<b>Podonki Slick</b> – снюс, в котором заявленная крепкость = реальная крепкость

10 вкусов: виноград, кокос, кола, ананас, вишня, малина, банан + мята, ментол, бабл гам

Тонкий пауч, не мешает, удобно носить. 27 порций – хватает надолго

Какой вкус твой базовый?</i>`,
    image: `${BASE}/Канал Train lab/Снюс/Podonki Slick/Готовые картинки/photo_2026-03-06_16-00-18.jpg`
  },
  {
    name: 'Podonki Critical (nicpak)',
    caption: `<i>Без пара. Без запаха. Без устройства. Но эффект – ого

<b>Podonki Critical</b> пластинки – 10 вкусов, 150 мг. Активируется за полминуты

Виноград, клубника-банан, апельсиновая фанта, баблгам, энергетик... Компактно, быстро, без лишних вопросов

Офис, метро, встреча – везде норм

Кто уже перешёл на пластинки?</i>`,
    image: `${BASE}/Канал Train lab/Никпаки/Podonki Critical/Готовые картинки/image_2026-01-23_14-03-35.png`
  },
  {
    name: 'Podonki x Mad',
    caption: `<i>Dubai Chocolate. Tropical Storm. Frozen Grape

Звучит как меню бара на крыше – а это <b>Podonki x Mad</b> пластинки

10 экзотических вкусов, 65 порций, 150 мг. Активация 30 секунд – без пара и следов

Когда хочется чего-то нового, а стандартная мята уже не цепляет

Самый необычный вкус – какой выберешь?</i>`,
    image: `${BASE}/Канал Train lab/Никпаки/Podonki x Mad/Готовые картинки/image_2026-01-23_13-08-59.png`
  },
  {
    name: 'Podonki Original (nicpak)',
    caption: `<i>Мята для консерваторов. Доктор Пеппер для экспериментаторов

<b>Podonki Original</b> пластинки – 10 вкусов на любой характер. 65 порций, 150 мг

Черника лёд, клубничный мохито, лесные ягоды, виноградная фанта, лимонная содовая, ананас-кокос, яблоко Фудзи...

Надёжный продукт без сюрпризов – соответствует ожиданиям на 100%

Классика или эксперимент – ты за что?</i>`,
    image: `${BASE}/Канал Train lab/Никпаки/Podonki Original/Готовые картинки/image_2026-01-21_16-34-39.png`
  },
  {
    name: 'Podonki Mini',
    caption: `<i>Помещается в кармане, работает на полную

<b>Podonki Mini</b> – жевательный табак, 6,5 гр, 20 порций. Компактная шайба для тех, кто всегда в движении

6 вкусов: виноград, малина, вишнёвая кола, сладкая мята, вишня, лесные ягоды

Маленький формат – не значит слабый. Идеален для старта

Какой вкус затестишь первым?</i>`,
    image: `${BASE}/Канал Podonki OFF/Жевательный табак/PDNK Mini/Готовые картинки/1.jpg`
  },
  {
    name: 'Podonki Original (tobacco)',
    caption: `<i>5 оттенков мяты. И каждый – другой

<b>Podonki Original</b> – жевательный табак для тех, кто знает, чего хочет

Мята. Ментол. Сладкая мята. Cold dry. Двойная мята

Два формата: Normal (16 паучей) или Slim (20 паучей) – выбирай под себя

Свежесть без химозного привкуса, стабильность от шайбы к шайбе

Ты за классику или двойную мяту?</i>`,
    image: `${BASE}/Канал Podonki OFF/Жевательный табак/Podonki Original/Мокапы/SWEET MINT.png`
  },
  {
    name: 'Podonki Click',
    caption: `<i>Сначала вкус. Потом щёлк – и ментоловый взрыв

<b>Podonki Click</b> – жевательный табак с капсулой. Два вкуса в одном пауче

10 вкусов: арбуз, кактус, вишня, мята, ананас, яблоко, дыня, кола, мятная жвачка, черника

Надкусил капсулу – и всё меняется. Как сюжетный поворот, только во рту

Кто уже щёлкал?</i>`,
    image: `${BASE}/Канал Podonki OFF/Жевательный табак/PDNK Click (с капсулой)/Готовые картинки/1.jpg`
  },
  {
    name: 'Podonki Swedish Collection',
    caption: `<i>Шведская технология, скандинавский дизайн, доступная цена

<b>Podonki Swedish Collection</b> – жевательный табак для тех, кто ценит качество без понтов

4 вкуса: Mint, Double Mint, Cold Dry, Cherry. 16 паучей, 10 гр

Красно-белая упаковка, минимализм – выглядит дороже, чем стоит

Классика, проверенная временем и технологией

Cherry или Double Mint – что ближе?</i>`,
    image: `${BASE}/Канал Podonki OFF/Жевательный табак/PDNK Swedish Collection/Готовые картинки/1.jpg`
  },
  {
    name: 'Классическая линейка Podgonki',
    caption: `<i>43 вкуса. Крепкость – какую хочешь. Конструктор, который ты собираешь сам

<b>Классическая линейка Podgonki</b> – фрукты, ягоды, газировки, сладости, освежающие. 5 категорий, и в каждой есть за что зацепиться

Банан-клубника, лимонад Байкал, мармелад, энергетик, персиковый йогурт... И это даже не половина списка

Новинки: чай бергамот, арбузная жвачка, малиновая сладкая вата, киви фейхоа

Какой вкус соберёшь?</i>`,
    image: `${BASE}/Канал Podonki OFF/Конструкторы/Классическая линейка Podgonki/Готовые картинки/image_2026-01-25_14-57-06.png`
  },
  {
    name: 'Кислая линейка Podgonki',
    caption: `<i>Было 15. Стало 25. Кислая линейка выросла вдвое

<b>Кислая линейка Podgonki</b> – 5 категорий кислоты: ягоды, фрукты, мармелад, напитки, экзотика

Брусника-малина, лайм с мятой, вишнёвый мармелад, розовый лимонад, личи-роза...

Крепкость на выбор: 0 мг, 20 мг, 50 мг или своя. Кислота пробуждает – факт

Продано 1 млн+ конструкторов. А ты свой уже собрал?</i>`,
    image: `${BASE}/Канал Podonki OFF/Конструкторы/Кислая линейка Podgonki/Готовые картинки/1.jpg`
  },
  {
    name: 'Американская линейка Podgonki',
    caption: `<i>10 американских ароматизаторов. Без химозных нот, только чистые миксы

<b>Американская линейка Podgonki</b> – премиум конструктор в бруклинском стиле

Высокая концентрация – флакона хватает дольше. Нет нагара, нет забитых испарителей

Сюрприз в каждой упаковке. QR-код на розыгрыш Chevrolet Camaro

Лимитка – потом не будет. Успел?</i>`,
    image: `${BASE}/Канал Podonki OFF/Конструкторы/Американская линейка Podgonki/Готовые картинки/1.jpg`
  }
]

async function sendPhoto(caption, imagePath) {
  const stats = fs.statSync(imagePath)
  let sendPath = imagePath
  const tmpPath = path.join(path.dirname(imagePath), '_tmp_compressed.jpg')

  if (stats.size > 10 * 1024 * 1024) {
    execSync(`python -c "from PIL import Image; img = Image.open(r'${imagePath.replace(/\\/g, '\\\\')}'); img = img.convert('RGB'); img.save(r'${tmpPath.replace(/\\/g, '\\\\')}', 'JPEG', quality=80)"`)
    sendPath = tmpPath
  }

  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(sendPath)
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
    const ext = path.extname(sendPath).slice(1) || 'jpg'
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'

    const parts = []
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="photo.${ext}"\r\nContent-Type: ${mime}\r\n\r\n`))
    parts.push(imageData)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendPhoto`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath) } catch {}
        const r = JSON.parse(d)
        if (r.ok) resolve(r.result.message_id)
        else reject(new Error(r.description || d))
      })
    })
    req.write(body)
    req.end()
  })
}

async function sendText(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML' })
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        const r = JSON.parse(d)
        if (r.ok) resolve(r.result.message_id)
        else reject(new Error(r.description || d))
      })
    })
    req.write(payload)
    req.end()
  })
}

async function main() {
  let sent = 0
  let skipped = 0

  for (const post of posts) {
    try {
      // Rate limit
      if (sent > 0) await new Promise(r => setTimeout(r, 1500))

      if (post.image && fs.existsSync(post.image)) {
        const msgId = await sendPhoto(post.caption, post.image)
        console.log(`[${++sent}] ${post.name} -> msg ${msgId}`)
      } else {
        const msgId = await sendText(post.caption)
        console.log(`[${++sent}] ${post.name} (text only) -> msg ${msgId}`)
        skipped++
      }
    } catch (e) {
      console.error(`[ERR] ${post.name}: ${e.message}`)
    }
  }

  console.log(`\nDone: ${sent} sent, ${skipped} without image`)
}

main()
