"""
GitHub API Examples для автоматизации Podonki (Python версия)
Использование: python scripts/github-api-examples.py
"""

import os
import json
import base64
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GitHubAPI:
    def __init__(self):
        self.token = os.getenv('GITHUB_TOKEN')
        self.owner = os.getenv('GITHUB_REPO_OWNER', 'YOUR_USERNAME')
        self.repo = os.getenv('GITHUB_REPO_NAME', 'podonki-content')
        self.base_url = 'https://api.github.com'

        if not self.token:
            raise ValueError('GITHUB_TOKEN не установлен')

        self.headers = {
            'Authorization': f'token {self.token}',
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
        }

    def _request(self, method: str, endpoint: str, body: Optional[Dict] = None) -> Dict:
        """Выполняет запрос к GitHub API"""
        url = f'{self.base_url}{endpoint}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=body)
            elif method == 'PUT':
                response = requests.put(url, headers=self.headers, json=body)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=body)
            else:
                raise ValueError(f'Unsupported method: {method}')

            if not response.ok:
                raise Exception(f'GitHub API Error: {response.status_code} - {response.text}')

            return response.json() if response.text else {}

        except Exception as e:
            logger.error(f'❌ Request failed: {str(e)}')
            raise

    # ==================== ISSUES ====================

    def create_content_issue(self, title: str, description: str, labels: List[str] = None) -> Dict:
        """Создает новую Issue для контента"""
        logger.info(f'📝 Creating issue: {title}')

        labels = labels or []
        labels.extend(['content'])

        body = {
            'title': title,
            'body': description,
            'labels': list(set(labels)),
            'assignees': [self.owner],
        }

        result = self._request('POST', f'/repos/{self.owner}/{self.repo}/issues', body)
        logger.info(f'✅ Issue created: #{result.get("number")}')
        return result

    def create_issues_from_ideas(self, ideas: List[Dict]) -> None:
        """Создает Issues для каждой идеи из IDEAS-BACKLOG"""
        logger.info(f'📚 Creating {len(ideas)} issues from ideas...')

        for idea in ideas:
            description = f"""
## Идея для контента

**Название:** {idea.get('title', 'No title')}
**Тип:** {idea.get('type', 'content')}
**Платформа:** {idea.get('platform', 'mixed')}

### Описание
{idea.get('description', 'No description')}

### Теги
{chr(10).join([f'- #{tag}' for tag in idea.get('tags', [])])}

### Критерии успеха
- [ ] Контент соответствует бренду
- [ ] Проверен на качество
- [ ] Готов к публикации
- [ ] Опубликован

### Сроки
Дедлайн: {datetime.now().strftime('%Y-%m-%d')}

---
*Создано автоматически GitHub Actions*
            """

            try:
                self.create_content_issue(
                    f"[{idea.get('type', 'CONTENT').upper()}] {idea.get('title', 'No title')}",
                    description,
                    [idea.get('platform', 'mixed'), idea.get('type', 'content')]
                )
            except Exception as e:
                logger.warning(f'⚠️  Failed to create issue for "{idea.get("title")}": {str(e)}')

        logger.info('✅ All issues created')

    def add_issue_comment(self, issue_number: int, comment: str) -> Dict:
        """Добавляет комментарий к Issue"""
        logger.info(f'💬 Adding comment to issue #{issue_number}')

        body = {'body': comment}
        result = self._request(
            'POST',
            f'/repos/{self.owner}/{self.repo}/issues/{issue_number}/comments',
            body
        )

        logger.info('✅ Comment added')
        return result

    def close_issue(self, issue_number: int) -> Dict:
        """Закрывает Issue"""
        logger.info(f'🚀 Closing issue #{issue_number}')

        body = {'state': 'closed'}
        result = self._request(
            'PATCH',
            f'/repos/{self.owner}/{self.repo}/issues/{issue_number}',
            body
        )

        logger.info('✅ Issue closed')
        return result

    # ==================== FILES ====================

    def read_file(self, path: str) -> tuple[str, str]:
        """Читает файл из репо"""
        logger.info(f'📖 Reading file: {path}')

        result = self._request('GET', f'/repos/{self.owner}/{self.repo}/contents/{path}')

        # Декодируем base64
        content = base64.b64decode(result['content']).decode('utf-8')
        sha = result['sha']

        return content, sha

    def write_file(self, path: str, content: str, message: str, sha: Optional[str] = None) -> Dict:
        """Сохраняет файл в репо"""
        logger.info(f'💾 Writing file: {path}')

        encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')

        body = {
            'message': message,
            'content': encoded_content,
            'branch': 'main',
        }

        if sha:
            body['sha'] = sha

        result = self._request('PUT', f'/repos/{self.owner}/{self.repo}/contents/{path}', body)
        logger.info(f'✅ File saved: {path}')
        return result

    def update_json_file(self, path: str, update_fn, message: str) -> Dict:
        """Обновляет JSON файл"""
        content, sha = self.read_file(path)

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = []

        data = update_fn(data)
        new_content = json.dumps(data, indent=2, ensure_ascii=False)

        return self.write_file(path, new_content, message, sha)

    def add_idea_to_backlog(self, idea: Dict) -> Dict:
        """Добавляет идею в IDEAS-BACKLOG.json"""
        logger.info(f'💡 Adding idea to backlog: {idea.get("title")}')

        def update_fn(ideas):
            new_idea = {
                **idea,
                'created_at': datetime.now().isoformat(),
                'id': f'idea-{int(datetime.now().timestamp() * 1000)}',
                'quality_score': 0,
                'posted': False,
            }
            return [new_idea] + ideas

        return self.update_json_file(
            'data/IDEAS-BACKLOG.json',
            update_fn,
            f'Add idea: {idea.get("title")}'
        )

    # ==================== RELEASES ====================

    def create_release(self, tag_name: str, name: str, body: str) -> Dict:
        """Создает Release"""
        logger.info(f'🎯 Creating release: {name}')

        release_body = {
            'tag_name': tag_name,
            'name': name,
            'body': body,
            'draft': False,
            'prerelease': False,
        }

        result = self._request('POST', f'/repos/{self.owner}/{self.repo}/releases', release_body)
        logger.info(f'✅ Release created: v{result.get("tag_name")}')
        return result

    def create_content_release(self, week_number: int) -> Dict:
        """Создает Release контента за неделю"""
        today = datetime.now()
        tag_name = f'content-week-{week_number}'
        name = f'Content Release Week {week_number} ({today.strftime("%Y-%m-%d")})'

        body = f"""
## Контент для недели {week_number}

**Период:** {today.strftime("%Y-%m-%d")}

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
        """

        return self.create_release(tag_name, name, body)

    # ==================== COMMITS ====================

    def get_latest_commits(self, limit: int = 10) -> List[Dict]:
        """Получает последние коммиты"""
        logger.info('📋 Getting latest commits...')

        result = self._request(
            'GET',
            f'/repos/{self.owner}/{self.repo}/commits?per_page={limit}'
        )

        return [
            {
                'sha': commit['sha'][:7],
                'message': commit['commit']['message'],
                'author': commit['commit']['author']['name'],
                'date': commit['commit']['author']['date'],
            }
            for commit in result
        ]

    def get_parsing_history(self) -> List[Dict]:
        """Получает историю парсинга (коммиты с "parse" в сообщении)"""
        logger.info('🔍 Getting parsing history...')

        commits = self.get_latest_commits(50)
        return [
            c for c in commits
            if 'parse' in c['message'].lower() or 'scrape' in c['message'].lower()
        ]

    # ==================== WORKFLOWS ====================

    def trigger_workflow(self, workflow_name: str, inputs: Dict = None) -> Dict:
        """Запускает GitHub Actions workflow вручную"""
        logger.info(f'⚡ Triggering workflow: {workflow_name}')

        body = {
            'ref': 'main',
            'inputs': inputs or {},
        }

        result = self._request(
            'POST',
            f'/repos/{self.owner}/{self.repo}/actions/workflows/{workflow_name}/dispatches',
            body
        )

        logger.info('✅ Workflow triggered')
        return result

    def trigger_competitors_parsing(self, platform: str = 'all') -> Dict:
        """Триггерит парсинг конкурентов"""
        return self.trigger_workflow('weekly-competitors-parse.yml', {'platform': platform})

    def trigger_content_generation(self) -> Dict:
        """Триггерит генерацию контента"""
        return self.trigger_workflow('daily-ideas-generation.yml')

    def trigger_telegram_posting(self, idea_index: int = -1) -> Dict:
        """Триггерит публикацию в Telegram"""
        return self.trigger_workflow(
            'scheduled-telegram-posting.yml',
            {'force_post_index': str(idea_index)}
        )


# ==================== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ====================

async def examples():
    """Примеры использования GitHub API"""
    try:
        github = GitHubAPI()

        # Пример 1: Получить последние коммиты
        print('\n=== Example 1: Recent commits ===')
        commits = github.get_latest_commits(5)
        for commit in commits:
            print(f"{commit['sha']} - {commit['message']} ({commit['author']})")

        # Пример 2: Получить историю парсинга
        print('\n=== Example 2: Parsing history ===')
        parsing_history = github.get_parsing_history()
        print(f'Found {len(parsing_history)} parsing commits')
        for commit in parsing_history[:3]:
            print(f"  - {commit['sha']}: {commit['message']}")

        # Пример 3: Прочитать IDEAS-BACKLOG
        print('\n=== Example 3: Read IDEAS-BACKLOG ===')
        ideas_content, _ = github.read_file('data/IDEAS-BACKLOG.json')
        ideas = json.loads(ideas_content)
        print(f'Loaded {len(ideas)} ideas')

        # Пример 4: Добавить новую идею
        print('\n=== Example 4: Add new idea ===')
        new_idea = {
            'title': 'Best vape unboxing tricks via GitHub API',
            'description': 'Генерированная идея через GitHub Actions',
            'type': 'video',
            'platform': 'tiktok',
            'tags': ['vape', 'unboxing', 'trends'],
            'quality_score': 8,
        }
        github.add_idea_to_backlog(new_idea)

        # Пример 5: Создать Issue для идеи
        print('\n=== Example 5: Create issue ===')
        github.create_content_issue(
            '[TikTok] Vape unboxing video trend',
            'Идея для видео в тренде\n\n- Целевая аудитория: 16-25\n- Длительность: 15-60 сек',
            ['tiktok', 'auto-generated']
        )

        # Пример 6: Триггер workflow
        print('\n=== Example 6: Trigger workflows ===')
        # Раскомментировать для реального использования:
        # github.trigger_content_generation()
        # github.trigger_competitors_parsing('tiktok')

        print('\n✅ All examples completed')

    except Exception as e:
        logger.error(f'❌ Error: {str(e)}')


if __name__ == '__main__':
    import asyncio
    asyncio.run(examples())
