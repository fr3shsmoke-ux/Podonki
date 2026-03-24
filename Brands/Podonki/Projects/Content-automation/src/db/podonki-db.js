/**
 * Podonki Local Database Manager
 * Works with JSON files as collections
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../../data')
const LOGS_DIR = path.join(__dirname, '../../logs')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

class PodokiDB {
  constructor() {
    this.dataDir = DATA_DIR;
    this.logsDir = LOGS_DIR;
    this.collections = {
      products: 'products.json',
      contentCalendar: 'content-calendar.json',
      generationLogs: 'generation-logs.json',
      rubrics: 'rubrics.json',
      analytics: 'analytics.json',
      systemPrompts: 'system-prompts.json'
    };
  }

  // ============ File Operations ============

  /**
   * Read collection file
   */
  readCollection(collectionName) {
    const filePath = path.join(this.dataDir, this.collections[collectionName]);
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${collectionName}:`, error.message);
      return [];
    }
  }

  /**
   * Write collection file (atomic: tmp → rename)
   * Prevents data corruption on crash/power loss
   */
  writeCollection(collectionName, data) {
    const filePath = path.join(this.dataDir, this.collections[collectionName])
    const tmpPath = filePath + `.tmp.${process.pid}.${Date.now()}`
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
      fs.renameSync(tmpPath, filePath)
      return true
    } catch (error) {
      console.error(`Error writing ${collectionName}:`, error.message)
      try { fs.unlinkSync(tmpPath) } catch {}
      return false
    }
  }

  // ============ Content Calendar ============

  /**
   * Add new post to calendar
   */
  addPost(postData) {
    const calendar = this.readCollection('contentCalendar');
    const post = {
      id: randomUUID(),
      ...postData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    calendar.push(post);
    this.writeCollection('contentCalendar', calendar);
    return post;
  }

  /**
   * Update post status
   */
  updatePostStatus(postId, status, publishedDate = null) {
    const calendar = this.readCollection('contentCalendar');
    const post = calendar.find(p => p.id === postId);
    if (!post) return null;

    post.status = status;
    post.updated_at = new Date().toISOString();
    if (publishedDate) {
      post.published_date = publishedDate;
    }

    this.writeCollection('contentCalendar', calendar);
    return post;
  }

  /**
   * Get calendar for date range
   */
  getCalendar(filters = {}) {
    const calendar = this.readCollection('contentCalendar');
    let filtered = calendar;

    if (filters.channel) {
      filtered = filtered.filter(p => p.channel === filters.channel);
    }
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.from_date) {
      filtered = filtered.filter(p => new Date(p.scheduled_date) >= new Date(filters.from_date));
    }
    if (filters.to_date) {
      filtered = filtered.filter(p => new Date(p.scheduled_date) <= new Date(filters.to_date));
    }

    return filtered.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }

  /**
   * Get post by ID
   */
  getPost(postId) {
    const calendar = this.readCollection('contentCalendar');
    return calendar.find(p => p.id === postId) || null;
  }

  // ============ Generation Logs ============

  /**
   * Log generation attempt
   */
  logGeneration(logData) {
    const logs = this.readCollection('generationLogs');
    const log = {
      id: randomUUID(),
      ...logData,
      timestamp: new Date().toISOString()
    };
    logs.push(log);
    this.writeCollection('generationLogs', logs);
    return log;
  }

  /**
   * Get generation statistics
   */
  getGenerationStats(filters = {}) {
    const logs = this.readCollection('generationLogs');
    let filtered = logs;

    if (filters.channel) {
      filtered = filtered.filter(l => l.channel === filters.channel);
    }
    if (filters.from_date) {
      filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filters.from_date));
    }
    if (filters.to_date) {
      filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(filters.to_date));
    }

    const totalAttempts = filtered.length;
    const successfulAttempts = filtered.filter(l => l.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const totalTokens = filtered.reduce((sum, l) => sum + (l.tokens_used || 0), 0);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
      totalTokens,
      avgTokensPerPost: totalAttempts > 0 ? Math.round(totalTokens / totalAttempts) : 0
    };
  }

  // ============ Analytics ============

  /**
   * Record post analytics
   */
  recordAnalytics(analyticsData) {
    const analytics = this.readCollection('analytics');
    const record = {
      ...analyticsData,
      recorded_at: new Date().toISOString()
    };
    analytics.push(record);
    this.writeCollection('analytics', analytics);
    return record;
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(filters = {}) {
    const analytics = this.readCollection('analytics');
    let filtered = analytics;

    if (filters.channel) {
      filtered = filtered.filter(a => a.channel === filters.channel);
    }
    if (filters.from_date) {
      filtered = filtered.filter(a => new Date(a.published_date) >= new Date(filters.from_date));
    }
    if (filters.to_date) {
      filtered = filtered.filter(a => new Date(a.published_date) <= new Date(filters.to_date));
    }

    const totalPosts = filtered.length;
    const totalEngagement = filtered.reduce((sum, a) => sum + (a.engagement || 0), 0);
    const avgEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0;

    // Top rubrics
    const rubricCount = {};
    filtered.forEach(a => {
      rubricCount[a.rubric] = (rubricCount[a.rubric] || 0) + 1;
    });
    const topRubrics = Object.entries(rubricCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rubric, count]) => ({ rubric, count }));

    // Top products
    const productCount = {};
    filtered.forEach(a => {
      productCount[a.product] = (productCount[a.product] || 0) + 1;
    });
    const topProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product, count]) => ({ product, count }));

    return {
      totalPosts,
      totalEngagement,
      avgEngagement: Math.round(avgEngagement),
      topRubrics,
      topProducts
    };
  }

  // ============ Rubrics ============

  /**
   * Get all rubrics
   */
  getRubrics(filters = {}) {
    const rubrics = this.readCollection('rubrics');
    let filtered = rubrics;

    if (filters.channel) {
      filtered = filtered.filter(r => r.channel === filters.channel);
    }
    if (filters.active !== undefined) {
      filtered = filtered.filter(r => r.active === filters.active);
    }

    return filtered;
  }

  /**
   * Get rubric by ID
   */
  getRubric(rubricId) {
    const rubrics = this.readCollection('rubrics');
    return rubrics.find(r => r.id === rubricId) || null;
  }

  /**
   * Add rubric
   */
  addRubric(rubricData) {
    const rubrics = this.readCollection('rubrics');
    const rubric = {
      id: rubricData.id || randomUUID(),
      ...rubricData,
      created_at: new Date().toISOString()
    };
    rubrics.push(rubric);
    this.writeCollection('rubrics', rubrics);
    return rubric;
  }

  // ============ System Prompts ============

  /**
   * Get all system prompts
   */
  getSystemPrompts(filters = {}) {
    const prompts = this.readCollection('systemPrompts');
    let filtered = prompts;

    if (filters.channel) {
      filtered = filtered.filter(p => p.channel === filters.channel);
    }
    if (filters.rubric) {
      filtered = filtered.filter(p => p.rubric === filters.rubric);
    }

    return filtered;
  }

  /**
   * Get system prompt by key
   */
  getSystemPrompt(key) {
    const prompts = this.readCollection('systemPrompts');
    return prompts.find(p => p.key === key) || null;
  }

  /**
   * Add system prompt
   */
  addSystemPrompt(promptData) {
    const prompts = this.readCollection('systemPrompts');
    const prompt = {
      ...promptData,
      version: promptData.version || 1,
      updated_at: new Date().toISOString()
    };
    prompts.push(prompt);
    this.writeCollection('systemPrompts', prompts);
    return prompt;
  }

  // ============ Products ============

  /**
   * Get all products
   */
  getProducts(filters = {}) {
    const products = this.readCollection('products');
    let filtered = products;

    if (filters.channel) {
      filtered = filtered.filter(p => p.channel === filters.channel);
    }
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    return filtered;
  }

  /**
   * Get product by ID
   */
  getProduct(productId) {
    const products = this.readCollection('products');
    return products.find(p => p.id === productId) || null;
  }

  // ============ Utilities ============

  /**
   * Get database stats
   */
  getStats() {
    const calendar = this.readCollection('contentCalendar');
    const logs = this.readCollection('generationLogs');
    const analytics = this.readCollection('analytics');
    const rubrics = this.readCollection('rubrics');
    const products = this.readCollection('products');

    return {
      posts: calendar.length,
      generationLogs: logs.length,
      analyticsRecords: analytics.length,
      rubrics: rubrics.length,
      products: products.length,
      postsByStatus: {
        draft: calendar.filter(p => p.status === 'draft').length,
        scheduled: calendar.filter(p => p.status === 'scheduled').length,
        published: calendar.filter(p => p.status === 'published').length,
        archived: calendar.filter(p => p.status === 'archived').length
      }
    };
  }

  /**
   * Export data to CSV (for Excel)
   */
  exportCalendarToCSV() {
    const calendar = this.readCollection('contentCalendar');
    const headers = ['ID', 'Channel', 'Rubric', 'Product ID', 'Status', 'Scheduled Date', 'Published Date', 'Tokens', 'Engagement'];
    const rows = calendar.map(post => [
      post.id,
      post.channel,
      post.rubric,
      post.product_id || '',
      post.status,
      post.scheduled_date,
      post.published_date || '',
      post.generation_tokens || 0,
      post.engagement_score || 0
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const csvPath = path.join(this.dataDir, 'content-calendar-export.csv');
    fs.writeFileSync(csvPath, csv, 'utf-8');
    return csvPath;
  }
}

export default new PodokiDB();
