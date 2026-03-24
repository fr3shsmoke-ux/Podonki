import { select, checkbox, input } from '@inquirer/prompts'

export async function askQuestions(questions, profileAnswers = {}) {
  const answers = {}
  const total = questions.length

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const prefix = `[${i + 1}/${total}]`

    if (profileAnswers[q.id]) {
      console.log(`${prefix} ${q.text} -> ${profileAnswers[q.id]} (из профиля)`)
      const change = await select({
        message: 'Изменить?',
        choices: [
          { name: 'Оставить', value: 'keep' },
          { name: 'Изменить', value: 'change' }
        ]
      })
      if (change === 'keep') {
        answers[q.id] = profileAnswers[q.id]
        continue
      }
    }

    const choices = q.options.map(opt => ({
      name: opt === 'Свой вариант' ? 'Свой вариант' : opt,
      value: opt
    }))

    let answer
    if (q.multi) {
      const selected = await checkbox({
        message: `${prefix} ${q.text}`,
        choices,
        required: true
      })

      if (selected.includes('Свой вариант')) {
        const custom = await input({ message: 'Свой вариант:' })
        const filtered = selected.filter(s => s !== 'Свой вариант')
        if (custom) filtered.push(custom)
        answer = filtered.join(', ')
      } else {
        answer = selected.join(', ')
      }
    } else {
      const selected = await select({
        message: `${prefix} ${q.text}`,
        choices
      })

      if (selected === 'Свой вариант') {
        answer = await input({ message: 'Свой вариант:' })
      } else {
        answer = selected
      }
    }

    answers[q.id] = answer
  }

  return answers
}
