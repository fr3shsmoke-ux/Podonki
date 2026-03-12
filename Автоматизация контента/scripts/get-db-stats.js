#!/usr/bin/env node

/**
 * Get Podonki Database Statistics
 * Display calendar, analytics, generation logs
 */

import db from '../src/db/podonki-db.js';

console.log('\n📊 PODONKI DATABASE STATISTICS\n');
console.log('═'.repeat(80));

// Overall stats
const stats = db.getStats();
console.log('\n📈 OVERALL STATISTICS\n');
console.log(`   Total posts: ${stats.posts}`);
console.log(`   Rubrics: ${stats.rubrics}`);
console.log(`   Products: ${stats.products}`);
console.log(`   Generation logs: ${stats.generationLogs}`);

// Post status
console.log('\n📄 POST STATUS DISTRIBUTION\n');
console.log(`   Draft: ${stats.postsByStatus.draft}`);
console.log(`   Scheduled: ${stats.postsByStatus.scheduled}`);
console.log(`   Published: ${stats.postsByStatus.published}`);
console.log(`   Archived: ${stats.postsByStatus.archived}`);

// Generation stats
console.log('\n🤖 GENERATION STATISTICS\n');
const genStats = db.getGenerationStats();
console.log(`   Total attempts: ${genStats.totalAttempts}`);
console.log(`   Successful: ${genStats.successfulAttempts}`);
console.log(`   Failed: ${genStats.failedAttempts}`);
console.log(`   Success rate: ${genStats.successRate.toFixed(1)}%`);
console.log(`   Total tokens used: ${genStats.totalTokens}`);
console.log(`   Avg tokens per post: ${genStats.avgTokensPerPost}`);

// Analytics summary
console.log('\n📊 ANALYTICS SUMMARY\n');
const analyticsSummary = db.getAnalyticsSummary();
console.log(`   Published posts: ${analyticsSummary.totalPosts}`);
console.log(`   Total engagement: ${analyticsSummary.totalEngagement}`);
console.log(`   Average engagement: ${analyticsSummary.avgEngagement}`);

if (analyticsSummary.topRubrics.length > 0) {
  console.log('\n   Top rubrics:');
  analyticsSummary.topRubrics.forEach(r => {
    console.log(`     • ${r.rubric}: ${r.count} posts`);
  });
}

if (analyticsSummary.topProducts.length > 0) {
  console.log('\n   Top products:');
  analyticsSummary.topProducts.forEach(p => {
    console.log(`     • ${p.product}: ${p.count} posts`);
  });
}

// Upcoming scheduled posts
console.log('\n📅 UPCOMING SCHEDULED POSTS (next 7 days)\n');
const calendar = db.getCalendar({ status: 'scheduled' });
const now = new Date();
const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const upcoming = calendar.filter(p => {
  const date = new Date(p.scheduled_date);
  return date >= now && date <= weekFromNow;
});

if (upcoming.length === 0) {
  console.log('   No scheduled posts for the next 7 days');
} else {
  upcoming.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  upcoming.forEach(post => {
    const date = new Date(post.scheduled_date).toLocaleString('ru-RU');
    console.log(`   • [${post.channel}] ${post.rubric}`);
    console.log(`     Scheduled: ${date}`);
    console.log(`     Product: ${post.product_id || 'auto'}\n`);
  });
}

// Rubrics by channel
console.log('\n🏢 RUBRICS BY CHANNEL\n');

['train_lab', 'podonki_off', 'b2c'].forEach(channel => {
  const channelRubrics = db.getRubrics({ channel, active: true });
  console.log(`   ${channel.toUpperCase()} (${channelRubrics.length})`);
  channelRubrics.forEach(r => {
    console.log(`     • ${r.name} (${Math.round(r.weight * 100)}%)`);
  });
  console.log('');
});

// Generation logs (last 10)
console.log('📝 LAST 10 GENERATION ATTEMPTS\n');
const logs = db.readCollection('generationLogs');
const lastLogs = logs.slice(-10).reverse();
lastLogs.forEach(log => {
  const status = log.success ? '✅' : '❌';
  const date = new Date(log.timestamp).toLocaleString('ru-RU');
  console.log(`   ${status} [${log.channel}] ${log.rubric} @ ${date}`);
  if (!log.success && log.error_message) {
    console.log(`      Error: ${log.error_message}`);
  }
  console.log(`      Tokens: ${log.tokens_used || 0}, Model: ${log.model}`);
});

console.log('\n═'.repeat(80));
console.log('\n💡 Commands:');
console.log('   • export calendar to CSV: node -e "import db from \'./src/db/podonki-db.js\'; console.log(db.exportCalendarToCSV())"');
console.log('   • get posts by channel: node -e "import db from \'./src/db/podonki-db.js\'; console.log(db.getCalendar({ channel: \'train_lab\' }))"');
console.log('\n');
