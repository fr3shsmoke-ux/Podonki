/**
 * GitHub API Examples для автоматизации Podonki
 * Использование: node scripts/github-api-examples.js
 */

const fetch = require('node-fetch');

class GitHubAPI {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.owner = 'YOUR_USERNAME'; // Заменить на реальный юзер
    this.repo = 'podonki-content'; // Заменить на реальный репо
    this.baseUrl = 'https://api.github.com';

    if (!this.token) {
      throw new Error('GITHUB_TOKEN не установлен в переменных окружения');
    }
  }

  async request(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API Error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== ISSUES ====================

  /**
   * Создает новую Issue для контент-задачи
   */
  async createContentIssue(title, description, labels = []) {
    console.log(`📝 Creating issue: ${title}`);

    const result = await this.request('POST', `/repos/${this.owner}/${this.repo}/issues`, {
      title,
      body: description,
      labels: ['content', ...labels],
      assignees: [this.owner],
    });

    console.log(`✅ Issue created: #${result.number}`);
    return result;
  }

  /**
   * Создает Issue для каждой идеи из IDEAS-BACKLOG
   */
  async createIssuesFromIdeas(ideas) {
    console.log(`\n📚 Creating ${ideas.length} issues from ideas...`);

    for (const idea of ideas) {
      const description = `
## Идея для контента

**Название:** ${idea.title}
**Тип:** ${idea.type}
**Платформа:** ${idea.platform}

### Описание
${idea.description}

### Теги
${idea.tags.map(tag => `- #${tag}`).join('\n')}

### Критерии успеха
- [ ] Контент соответствует бренду
- [ ] Проверен на качество
- [ ] Готов к публикации
- [ ] Опубликован

### Сроки
Дедлайн: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}

---
*Создано автоматически GitHub Actions*
      `;

      try {
        await this.createContentIssue(
          `[${idea.type.toUpperCase()}] ${idea.title}`,
          description,
          [idea.platform, idea.type]
        );
      } catch (error) {
        console.error(`⚠️  Failed to create issue for "${idea.title}"`);
      }
    }

    console.log(`✅ All issues created`);
  }

  /**
   * Обновляет Issue (например, добавляет комментарий)
   */
  async addIssueComment(issueNumber, comment) {
    console.log(`💬 Adding comment to issue #${issueNumber}`);

    const result = await this.request(
      'POST',
      `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`,
      { body: comment }
    );

    console.log(`✅ Comment added`);
    return result;
  }

  /**
   * Закрывает Issue
   */
  async closeIssue(issueNumber) {
    console.log(`🚀 Closing issue #${issueNumber}`);

    const result = await this.request(
      'PATCH',
      `/repos/${this.owner}/${this.repo}/issues/${issueNumber}`,
      { state: 'closed' }
    );

    console.log(`✅ Issue closed`);
    return result;
  }

  // ==================== FILES ====================

  /**
   * Читает файл из репо
   */
  async readFile(path) {
    console.log(`📖 Reading file: ${path}`);

    const result = await this.request(
      'GET',
      `/repos/${this.owner}/${this.repo}/contents/${path}`
    );

    // Декодируем base64
    const content = Buffer.from(result.content, 'base64').toString('utf-8');
    return { content, sha: result.sha };
  }

  /**
   * Сохраняет файл в репо
   */
  async writeFile(path, content, message, sha = null) {
    console.log(`💾 Writing file: ${path}`);

    const body = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch: 'main',
    };

    if (sha) {
      body.sha = sha; // Для обновления существующего файла
    }

    const result = await this.request(
      'PUT',
      `/repos/${this.owner}/${this.repo}/contents/${path}`,
      body
    );

    console.log(`✅ File saved: ${path}`);
    return result;
  }

  /**
   * Обновляет JSON файл (читает, изменяет, сохраняет)
   */
  async updateJsonFile(path, updateFn, message) {
    const { content, sha } = await this.readFile(path);

    let data = JSON.parse(content);
    data = updateFn(data);

    const newContent = JSON.stringify(data, null, 2);

    return this.writeFile(path, newContent, message, sha);
  }

  /**
   * Добавляет запись в IDEAS-BACKLOG.json
   */
  async addIdeaToBacklog(idea) {
    console.log(`\n💡 Adding idea to backlog: ${idea.title}`);

    return this.updateJsonFile(
      'data/IDEAS-BACKLOG.json',
      (ideas) => {
        // Добавляем новую идею в начало
        return [
          {
            ...idea,
            created_at: new Date().toISOString(),
            id: `idea-${Date.now()}`,
            quality_score: 0,
            posted: false,
          },
          ...ideas,
        ];
      },
      `Add idea: ${idea.title}`
    );
  }

  // ==================== RELEASES ====================

  /**
   * Создает Release (версия контента)
   */
  async createRelease(tagName, name, body) {
    console.log(`🎯 Creating release: ${name}`);

    const result = await this.request(
      'POST',
      `/repos/${this.owner}/${this.repo}/releases`,
      {
        tag_name: tagName,
        name,
        body,
        draft: false,
        prerelease: false,
      }
    );

    console.log(`✅ Release created: v${result.tag_name}`);
    return result;
  }

  /**
   * Создает Release контента (например, еженедельный выпуск)
   */
  async createContentRelease(weekNumber) {
    const today = new Date();
    const tagName = `content-week-${weekNumber}`;
    const name = `Content Release Week ${weekNumber} (${today.toLocaleDateString()})`;

    const body = `
## Контент для недели ${weekNumber}

**Период:** ${new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${today.toLocaleDateString()}

### Статистика
- Идей сгенерировано: TBD
- Постов опубликовано: TBD
- Платформы: TikTok, Telegram, Instagram

### Включено в выпуск
- COMPETITORS-TRACKING.json
- IDEAS-BACKLOG.json
- CONTENT-LOG.json

---
*Версионирование контента Podonki*
    `;

    return this.createRelease(tagName, name, body);
  }

  // ==================== COMMITS ====================

  /**
   * Получает последние коммиты
   */
  async getLatestCommits(limit = 10) {
    console.log(`📋 Getting latest commits...`);

    const result = await this.request(
      'GET',
      `/repos/${this.owner}/${this.repo}/commits?per_page=${limit}`
    );

    return result.map(commit => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
    }));
  }

  /**
   * Получает историю парсинга (коммиты с "parse" в сообщении)
   */
  async getParsingHistory() {
    console.log(`🔍 Getting parsing history...`);

    const commits = await this.getLatestCommits(50);

    return commits.filter(commit =>
      commit.message.toLowerCase().includes('parse') ||
      commit.message.toLowerCase().includes('scrape')
    );
  }

  // ==================== WORKFLOWS ====================

  /**
   * Запускает GitHub Actions workflow вручную
   */
  async triggerWorkflow(workflowName, inputs = {}) {
    console.log(`⚡ Triggering workflow: ${workflowName}`);

    const result = await this.request(
      'POST',
      `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowName}/dispatches`,
      {
        ref: 'main',
        inputs,
      }
    );

    console.log(`✅ Workflow triggered`);
    return result;
  }

  /**
   * Триггерит парсинг вручную
   */
  async triggerCompetitorsParsing(platform = 'all') {
    return this.triggerWorkflow('weekly-competitors-parse.yml', {
      platform,
    });
  }

  /**
   * Триггерит генерацию контента вручную
   */
  async triggerContentGeneration() {
    return this.triggerWorkflow('daily-ideas-generation.yml');
  }

  /**
   * Триггерит публикацию вручную (с выбором индекса)
   */
  async triggerTelegramPosting(ideaIndex = -1) {
    return this.triggerWorkflow('scheduled-telegram-posting.yml', {
      force_post_index: ideaIndex.toString(),
    });
  }
}

// ==================== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ====================

async function examples() {
  try {
    const github = new GitHubAPI();

    // Пример 1: Получить последние коммиты
    console.log('\n=== Example 1: Recent commits ===');
    const commits = await github.getLatestCommits(5);
    console.log(commits);

    // Пример 2: Получить историю парсинга
    console.log('\n=== Example 2: Parsing history ===');
    const parsingHistory = await github.getParsingHistory();
    console.log(`Found ${parsingHistory.length} parsing commits`);

    // Пример 3: Прочитать IDEAS-BACKLOG
    console.log('\n=== Example 3: Read IDEAS-BACKLOG ===');
    const { content: ideasContent } = await github.readFile('data/IDEAS-BACKLOG.json');
    const ideas = JSON.parse(ideasContent);
    console.log(`Loaded ${ideas.length} ideas`);

    // Пример 4: Добавить новую идею
    console.log('\n=== Example 4: Add new idea ===');
    const newIdea = {
      title: 'Best vape unboxing tricks via GitHub API',
      description: 'Генерированная идея через GitHub Actions',
      type: 'video',
      platform: 'tiktok',
      tags: ['vape', 'unboxing', 'trends'],
      quality_score: 8,
    };
    await github.addIdeaToBacklog(newIdea);

    // Пример 5: Создать Issue для идеи
    console.log('\n=== Example 5: Create issue ===');
    await github.createContentIssue(
      '[TikTok] Vape unboxing video trend',
      `Идея для видео в тренде\n\n- Целевая аудитория: 16-25\n- Длительность: 15-60 сек`,
      ['tiktok', 'auto-generated']
    );

    // Пример 6: Триггер workflow
    console.log('\n=== Example 6: Trigger workflows ===');
    // await github.triggerContentGeneration();
    // await github.triggerCompetitorsParsing('tiktok');

    console.log('\n✅ All examples completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Экспорт для использования в других скриптах
module.exports = GitHubAPI;

// Запуск примеров если файл запущен напрямую
if (require.main === module) {
  examples();
}
