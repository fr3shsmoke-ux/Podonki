import https from 'https'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const TOKEN = '8656548869:AAG7-MGcZVOaEoFhfGtlR8AHDmZx5YrsDNs'
const CHAT = '358580133'
const BASE = 'c:/Users/Пох кто/OneDrive/Рабочий стол/Projects/Podonki/Projects/Content-automation/Материалы/Канал Train lab/Жидкости'

const posts = [
  { name: 'Podgon', image: `${BASE}/Podonki Podgon/Готовые картинки/IMG_4937.JPG`,
    caption: '<i>25 вкусов за копейки – серьёзно?\n\nАга. <b>Podonki Podgon</b> – бюджетка, которая не стыдно парить\n\nФрукты, ягоды, напитки – 25 штук, и каждый на уровне. Крепкость 30 мг, мягко заходит\n\nНе надо переплачивать, чтобы получить нормальный вкус. Тут это доказали\n\nС какого начнёшь?</i>' },
  { name: 'Last Hap', image: `${BASE}/Podonki Last hap/Готовые картинки/IMG_4008.JPG`,
    caption: '<i>40 вкусов. Сорок. Не опечатка\n\n<b>Podonki Last Hap</b> – когда перепробовал всё и думал, что удивить уже нечем\n\nКонцентрация ароматизаторов x2 – вкус бьёт с первой затяжки и не отпускает. Лимонады, экзотика, крем, табак – тут реально есть всё\n\nКаждый вкус разрабатывали отдельно, а не просто меняли ароматизатор\n\nСколько из 40 ты уже попробовал?</i>' },
  { name: 'Hotspot', image: `${BASE}/Podonki x Hotspot - Resonanse/Готовые картинки/IMG_2499.PNG`,
    caption: '<i>Утром заряд. Днём свежесть. Вечером уют\n\n<b>Podonki x Hotspot – Resonance</b> – выбираешь не по вкусу, а по настроению\n\nSODA – газированный удар, когда нужна энергия\nFRESH – ледяная мята, когда голова кипит\nGELATO – кремовый десерт, когда хочется расслабиться\n\n15 вкусов, 3 состояния. Какое у тебя сейчас?</i>' },
  { name: 'Sour', image: `${BASE}/Podonki Sour/Готовые картинки/IMG_6059.JPG`,
    caption: '<i>Кислое – не для слабых\n\n<b>Podonki Sour</b> – 20 вкусов, которые реально будят. Без сладкой маскировки, чистая кислота с первой затяжки\n\nКислый виноград, мармелад, мохито, морс... Рецепторы скажут спасибо\n\nВкус, который невозможно спутать с другим. Попробовал – запомнил – вернулся\n\nСамый кислый из 20 – какой?</i>' },
  { name: 'Isterika', image: `${BASE}/Podonki x Isterika/Готовые картинки/IMG_8493.webp`,
    caption: '<i>Кислые червячки в вишне. Виноградный чупа-чупс. Ананасовая шипучка\n\nНе меню детского кафе – это <b>Podonki x Isterika</b>\n\n15 вкусов с ностальгией из детства и неожиданным финалом. Крепкость на пределе\n\nА упаковка – граффити-арт, который хочется собирать. Каждая шайба с разным дизайном\n\nКакой вкус из детства ты бы засунул в жидкость?</i>' }
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
