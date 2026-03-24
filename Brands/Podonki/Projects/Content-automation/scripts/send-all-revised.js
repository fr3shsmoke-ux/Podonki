import https from 'https'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const TOKEN = '8656548869:AAG7-MGcZVOaEoFhfGtlR8AHDmZx5YrsDNs'
const CHAT = '358580133'
const BASE = 'c:/Users/Пох кто/OneDrive/Рабочий стол/Projects/Podonki/Projects/Content-automation/Материалы/Канал Train lab'

const posts = [
  { name: 'Podgon', image: `${BASE}/Жидкости/Podonki Podgon/Готовые картинки/IMG_4937.JPG`,
    caption: '<i><b>25 вкусов за копейки – серьёзно?</b>\n\nАга. Podonki Podgon – бюджетка, которая не стыдно парить\n\nФрукты, ягоды, напитки – 25 штук, и каждый на уровне. Крепкость 30 мг, мягко заходит\n\nНе надо переплачивать, чтобы получить нормальный вкус. Тут это доказали\n\nС какого начнёшь?</i>' },
  { name: 'Last Hap', image: `${BASE}/Жидкости/Podonki Last hap/Готовые картинки/IMG_4008.JPG`,
    caption: '<i><b>40 вкусов. Сорок. Не опечатка</b>\n\nPodonki Last Hap – когда перепробовал всё и думал, что удивить уже нечем\n\nКонцентрация ароматизаторов x2 – вкус бьёт с первой затяжки и не отпускает. Лимонады, экзотика, крем, табак – тут реально есть всё\n\nКаждый вкус разрабатывали отдельно, а не просто меняли ароматизатор\n\nСколько из 40 ты уже попробовал?</i>' },
  { name: 'Hotspot', image: `${BASE}/Жидкости/Podonki x Hotspot - Resonanse/Готовые картинки/IMG_2499.PNG`,
    caption: '<i><b>Утром заряд. Днём свежесть. Вечером уют</b>\n\nPodonki x Hotspot – Resonance выбираешь не по вкусу, а по настроению\n\nSODA – газированный удар, когда нужна энергия\nFRESH – ледяная мята, когда голова кипит\nGELATO – кремовый десерт, когда хочется расслабиться\n\n15 вкусов, 3 состояния. Какое у тебя сейчас?</i>' },
  { name: 'Light', image: `${BASE}/Жидкости/Podonki Light/Готовые картинки/IMG_5558.png`,
    caption: '<i><b>Не все любят, когда бьёт по горлу</b>\n\nPodonki Light для тех, кто парит часто и не хочет перегружать рецепторы\n\n20 мг, мягко и со вкусом. 15 вкусов: манго-маракуйя, арбуз-мята, черничный йогурт... Вкус раскрывается плавно, без резкого удара\n\nКомфорт на весь день. Не экстрим, а удовольствие\n\nКто уже перешёл на лёгкую?</i>' },
  { name: 'Sour', image: `${BASE}/Жидкости/Podonki Sour/Готовые картинки/IMG_6059.JPG`,
    caption: '<i><b>Кислое – не для слабых</b>\n\nPodonki Sour для тех, кто ищет яркие ощущения. 20 вкусов, которые реально будят. Без сладкой маскировки, чистая кислота с первой затяжки\n\nКислый виноград, мармелад, мохито, морс... Рецепторы скажут спасибо\n\nВкус, который невозможно спутать с другим. Попробовал – запомнил – вернулся\n\nКакой для тебя самый кислый?</i>' },
  { name: 'Isterika', image: `${BASE}/Жидкости/Podonki x Isterika/Готовые картинки/IMG_8493.webp`,
    caption: '<i><b>Кислые червячки в вишне. Виноградный чупа-чупс. Ананасовая шипучка</b>\n\nНе меню детского кафе – это Podonki x Isterika\n\n15 вкусов с ностальгией из детства и неожиданным финалом. Крепкость на пределе\n\nА упаковка – граффити-арт, который хочется собирать. Каждая шайба с разным дизайном\n\nКакой вкус из детства ты бы засунул в жидкость?</i>' },
  { name: 'Slick', image: `${BASE}/Снюс/Podonki Slick/Готовые картинки/photo_2026-03-06_16-00-18.jpg`,
    caption: '<i><b>150 мг, 27 паучей, slim-формат. Без маркетинговых сказок</b>\n\nPodonki Slick – снюс, в котором заявленная крепость = реальная крепкость\n\n10 вкусов: виноград, кокос, кола, ананас, вишня, малина, банан плюс мята, ментол, бабл гам\n\nТонкий пауч, не мешает, удобно носить. 27 порций – хватает надолго\n\nКакой вкус твой базовый?</i>' },
  { name: 'Critical (nicpak)', image: `${BASE}/Никпаки/Podonki Critical/Готовые картинки/image_2026-01-23_14-03-35.png`,
    caption: '<i><b>Без пара. Без запаха. Без устройства. Но эффект – ого</b>\n\nPodonki Critical полоски – 10 вкусов, 150 мг. Активируется за полминуты\n\nВиноград, клубника-банан, апельсиновая фанта, баблгам, энергетик... Компактно, быстро, без лишних вопросов\n\nОфис, метро, встреча – везде норм\n\nКто уже перешёл на полоски?</i>' },
  { name: 'Mad', image: `${BASE}/Никпаки/Podonki x Mad/Готовые картинки/image_2026-01-23_13-08-59.png`,
    caption: '<i><b>Dubai Chocolate. Tropical Storm. Frozen Grape</b>\n\nЗвучит, как меню бара на крыше, а это пластинки Podonki x Mad\n\n10 экзотических вкусов, 65 порций, 150 мг. Активация за 30 секунд без пара и следов\n\nКогда хочется чего-то нового, а стандартная мята уже не цепляет\n\nКакой для тебя самый необычный вкус?</i>' },
  { name: 'Original (nicpak)', image: `${BASE}/Никпаки/Podonki Original/Готовые картинки/image_2026-01-21_16-34-39.png`,
    caption: '<i><b>Мята для консерваторов. Доктор Пеппер для экспериментаторов</b>\n\nPodonki Original пластинки – 10 вкусов на любой характер. 65 порций, 150 мг\n\nЧерника лёд, клубничный мохито, лесные ягоды, виноградная фанта, лимонная содовая, ананас-кокос, яблоко Фудзи...\n\nНадёжный продукт без сюрпризов – соответствует ожиданиям на 100%\n\nКлассика или эксперимент – ты за что?</i>' }
]

async function sendPhoto(caption, imagePath) {
  let sendPath = imagePath
  const tmpPath = path.join(path.dirname(imagePath), '_tmp.jpg')
  const stats = fs.statSync(imagePath)
  const ext = path.extname(imagePath).toLowerCase()

  if (stats.size > 10 * 1024 * 1024 || ext === '.webp') {
    const pyCmd = `from PIL import Image; img = Image.open(r'${imagePath}'); img = img.convert('RGB'); img.save(r'${tmpPath}', 'JPEG', quality=85)`
    execSync(`python -c "${pyCmd}"`)
    sendPath = tmpPath
  }

  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(sendPath)
    const boundary = '----FB' + Math.random().toString(36).slice(2)
    const sendExt = path.extname(sendPath).toLowerCase().slice(1) || 'jpg'
    const mime = sendExt === 'png' ? 'image/png' : 'image/jpeg'

    const parts = []
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="photo.${sendExt}"\r\nContent-Type: ${mime}\r\n\r\n`))
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
        else reject(new Error(r.description))
      })
    })
    req.write(body)
    req.end()
  })
}

async function main() {
  for (let i = 0; i < posts.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1500))
    try {
      const id = await sendPhoto(posts[i].caption, posts[i].image)
      console.log(`${posts[i].name} -> msg ${id}`)
    } catch (e) {
      console.error(`${posts[i].name} ERROR: ${e.message}`)
    }
  }
}

main()
