use std::collections::HashMap;

use chrono::{DateTime, Datelike, Timelike, Utc};
use napi_derive::napi;
use once_cell::sync::Lazy;
use regex::Regex;

// ═══════════════════════════════════════════════════════════════
// BM25+ Search — native Node.js module (zero overhead)
// ═══════════════════════════════════════════════════════════════

#[napi(object)]
pub struct SearchDoc {
    pub id: String,
    pub text: String,
    pub date: Option<String>,
}

#[napi(object)]
pub struct SearchResult {
    pub id: String,
    pub score: f64,
}

#[napi(object)]
pub struct BM25Options {
    pub k1: Option<f64>,
    pub b: Option<f64>,
    pub half_life_days: Option<f64>,
}

struct IndexEntry {
    doc_idx: usize,
    freq: u32,
}

struct BM25IndexInner {
    doc_ids: Vec<String>,
    doc_lengths: Vec<usize>,
    doc_dates: Vec<Option<String>>,
    index: HashMap<String, Vec<IndexEntry>>,
    avg_doc_length: f64,
    k1: f64,
    b: f64,
    half_life: f64,
}

#[napi]
pub struct NativeBM25 {
    inner: BM25IndexInner,
}

fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.len() > 1)
        .map(|t| t.to_string())
        .collect()
}

fn temporal_decay(date_str: &Option<String>, half_life_days: f64) -> f64 {
    match date_str {
        None => 1.0,
        Some(s) => {
            let parsed = chrono::DateTime::parse_from_rfc3339(s)
                .or_else(|_| chrono::DateTime::parse_from_rfc3339(&format!("{}Z", s.trim_end_matches('Z'))))
                .or_else(|_| {
                    chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
                        .map(|dt| dt.and_utc().fixed_offset())
                });
            match parsed {
                Ok(dt) => {
                    let age_days = (Utc::now() - dt.with_timezone(&Utc)).num_seconds() as f64 / 86400.0;
                    0.5_f64.powf(age_days / half_life_days)
                }
                Err(_) => 1.0,
            }
        }
    }
}

#[napi]
impl NativeBM25 {
    #[napi(constructor)]
    pub fn new(options: Option<BM25Options>) -> Self {
        let opts = options.unwrap_or(BM25Options { k1: None, b: None, half_life_days: None });
        NativeBM25 {
            inner: BM25IndexInner {
                doc_ids: Vec::new(),
                doc_lengths: Vec::new(),
                doc_dates: Vec::new(),
                index: HashMap::new(),
                avg_doc_length: 0.0,
                k1: opts.k1.unwrap_or(1.5),
                b: opts.b.unwrap_or(0.75),
                half_life: opts.half_life_days.unwrap_or(30.0),
            },
        }
    }

    #[napi]
    pub fn add_documents(&mut self, docs: Vec<SearchDoc>) {
        let inner = &mut self.inner;
        for doc in docs {
            let tokens = tokenize(&doc.text);
            let len = tokens.len();
            let idx = inner.doc_ids.len();

            inner.doc_ids.push(doc.id);
            inner.doc_lengths.push(len);
            inner.doc_dates.push(doc.date);

            let mut term_freq: HashMap<&str, u32> = HashMap::new();
            for token in &tokens {
                *term_freq.entry(token.as_str()).or_insert(0) += 1;
            }

            for (term, freq) in term_freq {
                inner.index
                    .entry(term.to_string())
                    .or_default()
                    .push(IndexEntry { doc_idx: idx, freq });
            }
        }

        let total: usize = inner.doc_lengths.iter().sum();
        let n = inner.doc_ids.len();
        inner.avg_doc_length = if n > 0 { total as f64 / n as f64 } else { 0.0 };
    }

    #[napi]
    pub fn search(&self, query: String, limit: Option<u32>) -> Vec<SearchResult> {
        let limit = limit.unwrap_or(5) as usize;
        let query_tokens = tokenize(&query);
        let inner = &self.inner;

        if query_tokens.is_empty() || inner.doc_ids.is_empty() {
            return vec![];
        }

        let n = inner.doc_ids.len() as f64;
        let mut scores = vec![0.0_f64; inner.doc_ids.len()];

        for term in &query_tokens {
            if let Some(postings) = inner.index.get(term) {
                let df = postings.len() as f64;
                let idf = ((n - df + 0.5) / (df + 0.5) + 1.0).ln();

                for entry in postings {
                    let tf = entry.freq as f64;
                    let doc_len = inner.doc_lengths[entry.doc_idx] as f64;

                    let numerator = tf * (inner.k1 + 1.0);
                    let denominator = tf + inner.k1 * (1.0 - inner.b + inner.b * (doc_len / inner.avg_doc_length));
                    let bm25_score = idf * (numerator / denominator + 1.0);

                    let decay = temporal_decay(&inner.doc_dates[entry.doc_idx], inner.half_life);
                    scores[entry.doc_idx] += bm25_score * decay;
                }
            }
        }

        let mut results: Vec<(usize, f64)> = scores.iter()
            .enumerate()
            .filter(|(_, &s)| s > 0.0)
            .map(|(i, &s)| (i, s))
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        results.truncate(limit);

        results.into_iter()
            .map(|(i, score)| SearchResult {
                id: inner.doc_ids[i].clone(),
                score,
            })
            .collect()
    }

    #[napi]
    pub fn clear(&mut self) {
        self.inner.doc_ids.clear();
        self.inner.doc_lengths.clear();
        self.inner.doc_dates.clear();
        self.inner.index.clear();
        self.inner.avg_doc_length = 0.0;
    }

    #[napi(getter)]
    pub fn size(&self) -> u32 {
        self.inner.doc_ids.len() as u32
    }
}

// ═══════════════════════════════════════════════════════════════
// Deep Analysis — native Node.js module
// ═══════════════════════════════════════════════════════════════

static TY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\b(?:ты|тебе|тебя|твой|твоей|твоих|твоему)\b").unwrap());
static VY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\b(?:вы|вам|вас|ваш|вашей|ваших|вашему)\b").unwrap());
static URL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"https?://\S+").unwrap());
static MENTION_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"@[\w]+").unwrap());
static SENT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"[.!?…]+").unwrap());
static LIST_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"[✅🟢➖•\-]\s*\S").unwrap());
static NUM_LIST_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\d[.)\s]").unwrap());

const CASUAL_MARKERS: &[&str] = &[
    "кстати", "короче", "офигеть", "блин", "ваще", "норм", "чё", "зацени",
    "реально", "прикол", "кайф", "огонь", "жесть", "чёт", "чел",
    "лол", "ахах", "хах", "ору", "залетай", "зацепил",
    "круто", "бомба", "дерзкий", "дерзко", "зашёл", "крутяк",
    "бро", "чувак", "забей", "зашибись", "клёво", "окей",
    "буллшит", "химоз", "горчат", "дуреете", "кайфуй", "мощь",
    "банальщин", "фигня", "нафиг", "тащит",
];

const FORMAL_MARKERS: &[&str] = &[
    "уважаемый", "данный", "является", "осуществлять", "в связи с",
    "настоящим", "информируем", "предоставляем", "функционал",
    "в рамках", "посредством", "вышеуказанный", "нижеследующий",
];

fn is_emoji(c: char) -> bool {
    let cp = c as u32;
    (0x1F600..=0x1F64F).contains(&cp)
        || (0x1F300..=0x1F5FF).contains(&cp)
        || (0x1F680..=0x1F6FF).contains(&cp)
        || (0x1F1E0..=0x1F1FF).contains(&cp)
        || (0x2702..=0x27B0).contains(&cp)
        || (0x1F900..=0x1F9FF).contains(&cp)
        || (0x1FA00..=0x1FA6F).contains(&cp)
        || (0x1FA70..=0x1FAFF).contains(&cp)
        || (0x2600..=0x26FF).contains(&cp)
        || (0x2700..=0x27BF).contains(&cp)
        || (0xFE00..=0xFE0F).contains(&cp)
        || cp == 0x200D
        || cp == 0x2B50 || cp == 0x2B55
        || cp == 0x203C || cp == 0x2049
        || cp == 0x2139
}

#[napi(object)]
pub struct TextAnalysis {
    pub length: u32,
    pub emoji_count: u32,
    pub casual_score: u32,
    pub formal_score: u32,
    pub has_question: bool,
    pub has_list: bool,
    pub has_paragraphs: bool,
    pub sentence_count: u32,
    pub structure_score: f64,
    pub addressing: String,
}

#[napi]
pub fn analyze_text(text: String) -> TextAnalysis {
    let lower = text.to_lowercase();
    let emoji_count = text.chars().filter(|&c| is_emoji(c)).count();
    let casual = CASUAL_MARKERS.iter().filter(|m| lower.contains(*m)).count();
    let formal = FORMAL_MARKERS.iter().filter(|m| lower.contains(*m)).count();
    let has_question = text.contains('?') || text.contains('❓');
    let has_list = LIST_RE.is_match(&text) || NUM_LIST_RE.is_match(&text);
    let has_paragraphs = text.contains("\n\n") || text.matches('\n').count() >= 3;

    let clean = URL_RE.replace_all(&text, "");
    let clean = MENTION_RE.replace_all(&clean, "");
    let sentences = SENT_RE.split(&clean).filter(|s| s.trim().len() > 5).count();

    let ty = TY_RE.find_iter(&lower).count();
    let vy = VY_RE.find_iter(&lower).count();
    let addressing = if ty > vy { "ты" } else if vy > ty { "вы" } else if ty > 0 { "mixed" } else { "none" };

    let mut score: f64 = 0.0;
    if has_paragraphs { score += 1.0; }
    if has_list { score += 1.0; }
    if has_question { score += 0.5; }
    if emoji_count > 0 { score += 0.5; }
    let n_lines = text.matches('\n').count();
    if n_lines >= 5 { score += 1.0; } else if n_lines >= 2 { score += 0.5; }
    if text.len() > 300 { score += 0.5; }
    score = score.min(5.0);

    TextAnalysis {
        length: text.len() as u32,
        emoji_count: emoji_count as u32,
        casual_score: casual as u32,
        formal_score: formal as u32,
        has_question,
        has_list,
        has_paragraphs,
        sentence_count: sentences as u32,
        structure_score: score,
        addressing: addressing.to_string(),
    }
}

// ═══════════════════════════════════════════════════════════════
// Deep Analysis — batch analyze posts natively
// ═══════════════════════════════════════════════════════════════

static CTA_PATTERNS: Lazy<Vec<(&str, Regex)>> = Lazy::new(|| vec![
    ("пиши", Regex::new(r"пиши(?:те)?").unwrap()),
    ("подпис", Regex::new(r"подпис\w+").unwrap()),
    ("ставь", Regex::new(r"ставь(?:те)?").unwrap()),
    ("попробуй", Regex::new(r"попробуй(?:те)?").unwrap()),
    ("участвуй", Regex::new(r"участвуй(?:те)?").unwrap()),
    ("менеджер", Regex::new(r"менеджер\w*").unwrap()),
    ("жми", Regex::new(r"жми(?:те)?").unwrap()),
    ("купи", Regex::new(r"купи(?:те)?").unwrap()),
    ("забери", Regex::new(r"забери(?:те)?|забирай(?:те)?").unwrap()),
    ("узнай", Regex::new(r"узна[йю]\w*").unwrap()),
    ("выбирай", Regex::new(r"выбирай(?:те)?").unwrap()),
    ("переходи", Regex::new(r"переходи(?:те)?").unwrap()),
    ("голосуй", Regex::new(r"голосуй(?:те)?").unwrap()),
    ("угадай", Regex::new(r"угадай(?:те)?").unwrap()),
]);

const PRODUCT_DB: &[(&str, &[&str])] = &[
    ("Конструктор", &["конструктор", "pdnk конструктор"]),
    ("Podgon", &["podgon", "подгон"]),
    ("Podgonki", &["podgonki", "подгонки"]),
    ("Critical", &["critical", "критикал"]),
    ("Original", &["original", "оригинал"]),
    ("Last Hap", &["last hap", "ласт хап"]),
    ("Никпак", &["никпак", "nickpack", "nick pack"]),
    ("Hotspot", &["hotspot", "хотспот"]),
    ("Sour", &["sour", "кислый", "кислая линейка"]),
    ("Slick", &["slick", "слик"]),
    ("Click", &["click", "клик"]),
    ("Mini", &["pdnk mini"]),
    ("Swedish", &["swedish"]),
    ("Vintage", &["vintage", "винтаж"]),
];

const DAYS_RU: &[&str] = &["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

fn find_products(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    PRODUCT_DB.iter()
        .filter(|(_, kws)| kws.iter().any(|kw| lower.contains(kw)))
        .map(|(name, _)| name.to_string())
        .collect()
}

fn find_ctas(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    CTA_PATTERNS.iter()
        .filter(|(_, re)| re.is_match(&lower))
        .map(|(label, _)| label.to_string())
        .collect()
}

fn classify_post(text: &str, has_media: bool) -> String {
    let lower = text.to_lowercase();
    let length = text.len();
    let products = find_products(text);

    if length < 50 && has_media { return "media_only".into(); }
    if length < 80 && products.is_empty() { return "engagement".into(); }

    if ["угадай", "какой вкус", "викторин", "загадк", "отгадай", "правильный ответ", "голосуй"]
        .iter().any(|m| lower.contains(m)) { return "quiz_game".into(); }

    if ["розыгрыш", "конкурс", "приз", "победител", "разыгры", "участвуй", "условия", "подпис", "репост"]
        .iter().filter(|m| lower.contains(*m)).count() >= 2 { return "promo_contest".into(); }

    if length < 200 && ["💀", "😂", "🤣", "ору", "мем", "ахах", "ахаха", "прикол"]
        .iter().any(|m| lower.contains(m) || text.contains(m)) { return "meme_fun".into(); }

    if !products.is_empty() && length > 200 && ["вкус", "крепость", "линейка", "мг", "что такое", "что внутри", "фаворит"]
        .iter().filter(|m| lower.contains(*m)).count() >= 2 { return "product_desc".into(); }

    if !products.is_empty() && (!find_ctas(text).is_empty() ||
        ["купи", "забери", "попробуй", "менеджер"].iter().any(|m| lower.contains(m))) {
        return "promo_contest".into();
    }

    if ["что такое", "почему", "как работает", "совет", "гайд", "правил", "объясня", "расскажем"]
        .iter().any(|m| lower.contains(m)) && length > 150 { return "info_edu".into(); }

    if ["внимание", "анонс", "новост", "обновлен", "важно", "‼️", "⚡️", "🚨", "❗"]
        .iter().any(|m| lower.contains(m) || text.contains(m)) { return "announcement".into(); }

    if ["поздравля", "праздник", "с днём", "с новым", "с 8 март", "настроен", "история"]
        .iter().any(|m| lower.contains(m)) { return "entertainment".into(); }

    if length < 100 { return "engagement".into(); }
    if !products.is_empty() { return "promo_contest".into(); }
    if LIST_RE.is_match(text) || NUM_LIST_RE.is_match(text) || text.contains("\n\n") { return "info_edu".into(); }
    "promo_contest".into()
}

fn parse_date(s: &str) -> Option<DateTime<Utc>> {
    chrono::DateTime::parse_from_rfc3339(s)
        .or_else(|_| chrono::DateTime::parse_from_rfc3339(&format!("{}Z", s.trim_end_matches('Z'))))
        .map(|dt| dt.with_timezone(&Utc))
        .ok()
        .or_else(|| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S").map(|dt| dt.and_utc()).ok())
}

fn round1(v: f64) -> f64 { (v * 10.0).round() / 10.0 }
fn round2(v: f64) -> f64 { (v * 100.0).round() / 100.0 }
fn median_f64(sorted: &[f64]) -> f64 {
    if sorted.is_empty() { return 0.0; }
    let n = sorted.len();
    if n % 2 == 0 { (sorted[n/2-1] + sorted[n/2]) / 2.0 } else { sorted[n/2] }
}

#[napi(object)]
pub struct PostInput {
    pub id: String,
    pub text: String,
    pub date: String,
    pub has_media: bool,
}

#[napi(object)]
pub struct PostAnalysis {
    pub id: String,
    pub length: u32,
    pub category: String,
    pub emoji_count: u32,
    pub casual_score: u32,
    pub formal_score: u32,
    pub structure_score: f64,
    pub has_question: bool,
    pub has_list: bool,
    pub has_paragraphs: bool,
    pub sentence_count: u32,
    pub addressing: String,
    pub ctas: Vec<String>,
    pub products: Vec<String>,
}

#[napi(object)]
pub struct AnalysisReport {
    pub total_posts: u32,
    pub avg_length: f64,
    pub median_length: f64,
    pub media_rate: f64,
    pub casual_pct: f64,
    pub formal_pct: f64,
    pub avg_casual_score: f64,
    pub avg_structure_score: f64,
    pub question_pct: f64,
    pub cta_pct: f64,
    pub posts_per_week: f64,
    pub busiest_day: String,
    pub posts: Vec<PostAnalysis>,
}

/// Batch analyze posts — full deep analysis natively
#[napi]
pub fn analyze_posts(posts: Vec<PostInput>) -> AnalysisReport {
    let n = posts.len();
    let nf = n as f64;

    let mut analyzed: Vec<PostAnalysis> = Vec::with_capacity(n);
    let mut lengths: Vec<f64> = Vec::with_capacity(n);
    let mut casual_count = 0usize;
    let mut formal_count = 0usize;
    let mut casual_sum = 0usize;
    let mut struct_sum = 0.0f64;
    let mut question_count = 0usize;
    let mut cta_count = 0usize;
    let mut media_count = 0usize;
    let mut dow_counts: HashMap<usize, usize> = HashMap::new();
    let mut dates: Vec<DateTime<Utc>> = Vec::with_capacity(n);

    for post in &posts {
        let text = &post.text;
        let lower = text.to_lowercase();
        let len = text.len();
        lengths.push(len as f64);

        let emoji_count = text.chars().filter(|&c| is_emoji(c)).count();
        let casual = CASUAL_MARKERS.iter().filter(|m| lower.contains(*m)).count();
        let formal = FORMAL_MARKERS.iter().filter(|m| lower.contains(*m)).count();
        let has_question = text.contains('?') || text.contains('❓');
        let has_list = LIST_RE.is_match(text) || NUM_LIST_RE.is_match(text);
        let has_paragraphs = text.contains("\n\n") || text.matches('\n').count() >= 3;
        let clean = URL_RE.replace_all(text, "");
        let clean = MENTION_RE.replace_all(&clean, "");
        let sentences = SENT_RE.split(&clean).filter(|s| s.trim().len() > 5).count();
        let ty = TY_RE.find_iter(&lower).count();
        let vy = VY_RE.find_iter(&lower).count();
        let addressing = if ty > vy { "ты" } else if vy > ty { "вы" } else if ty > 0 { "mixed" } else { "none" };

        let mut score: f64 = 0.0;
        if has_paragraphs { score += 1.0; }
        if has_list { score += 1.0; }
        if has_question { score += 0.5; }
        if emoji_count > 0 { score += 0.5; }
        let n_lines = text.matches('\n').count();
        if n_lines >= 5 { score += 1.0; } else if n_lines >= 2 { score += 0.5; }
        if len > 300 { score += 0.5; }
        score = score.min(5.0);

        let category = classify_post(text, post.has_media);
        let ctas = find_ctas(text);
        let products = find_products(text);

        if casual > 0 { casual_count += 1; }
        if formal > 0 { formal_count += 1; }
        casual_sum += casual;
        struct_sum += score;
        if has_question { question_count += 1; }
        if !ctas.is_empty() { cta_count += 1; }
        if post.has_media { media_count += 1; }

        if let Some(dt) = parse_date(&post.date) {
            let dow = dt.weekday().num_days_from_monday() as usize;
            *dow_counts.entry(dow).or_insert(0) += 1;
            dates.push(dt);
        }

        analyzed.push(PostAnalysis {
            id: post.id.clone(),
            length: len as u32,
            category,
            emoji_count: emoji_count as u32,
            casual_score: casual as u32,
            formal_score: formal as u32,
            structure_score: score,
            has_question,
            has_list,
            has_paragraphs,
            sentence_count: sentences as u32,
            addressing: addressing.to_string(),
            ctas,
            products,
        });
    }

    let mut sorted_lengths = lengths.clone();
    sorted_lengths.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let busiest_dow = dow_counts.iter().max_by_key(|(_, &v)| v).map(|(&k, _)| k).unwrap_or(0);

    dates.sort();
    let total_days = if dates.len() >= 2 {
        (dates.last().unwrap().signed_duration_since(*dates.first().unwrap())).num_days() as f64
    } else { 7.0 };
    let posts_per_week = nf / (total_days / 7.0).max(1.0);

    AnalysisReport {
        total_posts: n as u32,
        avg_length: round1(lengths.iter().sum::<f64>() / nf),
        median_length: round1(median_f64(&sorted_lengths)),
        media_rate: round1(media_count as f64 / nf * 100.0),
        casual_pct: round1(casual_count as f64 / nf * 100.0),
        formal_pct: round1(formal_count as f64 / nf * 100.0),
        avg_casual_score: round2(casual_sum as f64 / nf),
        avg_structure_score: round2(struct_sum / nf),
        question_pct: round1(question_count as f64 / nf * 100.0),
        cta_pct: round1(cta_count as f64 / nf * 100.0),
        posts_per_week: round1(posts_per_week),
        busiest_day: DAYS_RU.get(busiest_dow).unwrap_or(&"").to_string(),
        posts: analyzed,
    }
}

// ═══════════════════════════════════════════════════════════════
// HTML Parser — parse Telegram HTML export natively
// ═══════════════════════════════════════════════════════════════

static TAG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"<[^>]+>").unwrap());
static MULTI_SPACE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"  +").unwrap());
static MULTI_NL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\n{3,}").unwrap());
static MSG_START_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"<div class="message default clearfix"[^>]*id="message(\d+)">"#).unwrap()
});
static DATE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"title="([^"]+)""#).unwrap());
static TEXT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"<div class="text">([\s\S]*?)</div>"#).unwrap());
static REACTION_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"<span class="emoji">\s*([\s\S]*?)\s*</span>\s*<span class="count">(\d+)</span>"#).unwrap()
});
static MEDIA_TAG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"<(?:img|video|audio)[^>]*>"#).unwrap());

fn decode_html(text: &str) -> String {
    text.replace("&nbsp;", " ")
        .replace("&lt;", "<").replace("&gt;", ">")
        .replace("&quot;", "\"").replace("&amp;", "&").replace("&#039;", "'")
}

fn strip_tags(html: &str) -> String {
    let text = html.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n");
    let text = TAG_RE.replace_all(&text, "");
    let text = decode_html(&text);
    let text = MULTI_SPACE_RE.replace_all(&text, " ");
    let text = MULTI_NL_RE.replace_all(&text, "\n\n");
    text.trim().to_string()
}

#[napi(object)]
pub struct ParsedPost {
    pub id: u32,
    pub date: String,
    pub text: String,
    pub has_media: bool,
    pub engagement_score: u32,
}

#[napi(object)]
pub struct HtmlParseResult {
    pub total_posts: u32,
    pub posts: Vec<ParsedPost>,
}

/// Parse Telegram HTML export into structured data
#[napi]
pub fn parse_telegram_html(html: String) -> HtmlParseResult {
    let starts: Vec<(usize, u32)> = MSG_START_RE.captures_iter(&html).map(|cap| {
        let m = cap.get(0).unwrap();
        let id: u32 = cap[1].parse().unwrap_or(0);
        (m.start(), id)
    }).collect();

    let mut posts = Vec::new();
    for (i, &(start, msg_id)) in starts.iter().enumerate() {
        let end = if i + 1 < starts.len() { starts[i + 1].0 } else { html.len() };
        let block = &html[start..end];

        let date = DATE_RE.captures(block).map(|c| c[1].to_string()).unwrap_or_default();
        let text = TEXT_RE.captures(block).map(|c| strip_tags(&c[1])).unwrap_or_default();
        let has_media = MEDIA_TAG_RE.is_match(block);

        let mut engagement_score: u32 = 0;
        for rcap in REACTION_RE.captures_iter(block) {
            engagement_score += rcap[2].parse::<u32>().unwrap_or(0);
        }

        if !text.is_empty() || has_media {
            posts.push(ParsedPost { id: msg_id, date, text, has_media, engagement_score });
        }
    }

    HtmlParseResult { total_posts: posts.len() as u32, posts }
}

// ═══════════════════════════════════════════════════════════════
// JSON Processor — fast JSON operations natively
// ═══════════════════════════════════════════════════════════════

/// Filter JSON array by field value (substring match)
#[napi]
pub fn json_filter(json_str: String, field: String, value: String) -> String {
    let data: serde_json::Value = serde_json::from_str(&json_str).unwrap_or(serde_json::Value::Null);
    let items = match &data {
        serde_json::Value::Array(arr) => arr.clone(),
        _ => vec![data],
    };
    let lower_val = value.to_lowercase();
    let filtered: Vec<&serde_json::Value> = items.iter().filter(|item| {
        item.get(&field).map(|fv| {
            match fv {
                serde_json::Value::String(s) => s.to_lowercase().contains(&lower_val),
                _ => fv.to_string().to_lowercase().contains(&lower_val),
            }
        }).unwrap_or(false)
    }).collect();
    serde_json::to_string(&filtered).unwrap_or("[]".into())
}

/// Group JSON array by field, return counts
#[napi]
pub fn json_group_by(json_str: String, field: String) -> Vec<Vec<String>> {
    let data: serde_json::Value = serde_json::from_str(&json_str).unwrap_or(serde_json::Value::Null);
    let items = match &data {
        serde_json::Value::Array(arr) => arr.clone(),
        _ => vec![data],
    };
    let mut groups: HashMap<String, usize> = HashMap::new();
    for item in &items {
        let key = item.get(&field)
            .map(|v| match v { serde_json::Value::String(s) => s.clone(), _ => v.to_string() })
            .unwrap_or_else(|| "(null)".into());
        *groups.entry(key).or_insert(0) += 1;
    }
    let mut sorted: Vec<(String, usize)> = groups.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));
    sorted.into_iter().map(|(k, v)| vec![k, v.to_string()]).collect()
}

// ═══════════════════════════════════════════════════════════════
// CSV Converter — fast CSV↔JSON natively
// ═══════════════════════════════════════════════════════════════

/// Convert CSV string to JSON string
#[napi]
pub fn csv_to_json(csv_str: String) -> String {
    let mut reader = csv::ReaderBuilder::new().from_reader(csv_str.as_bytes());
    let headers: Vec<String> = reader.headers()
        .map(|h| h.iter().map(|s| s.to_string()).collect())
        .unwrap_or_default();

    let mut records: Vec<serde_json::Map<String, serde_json::Value>> = Vec::new();
    for result in reader.records() {
        if let Ok(record) = result {
            let mut obj = serde_json::Map::new();
            for (i, field) in record.iter().enumerate() {
                if i < headers.len() {
                    let value = if let Ok(n) = field.parse::<i64>() {
                        serde_json::Value::Number(n.into())
                    } else if let Ok(n) = field.parse::<f64>() {
                        serde_json::json!(n)
                    } else {
                        serde_json::Value::String(field.to_string())
                    };
                    obj.insert(headers[i].clone(), value);
                }
            }
            records.push(obj);
        }
    }
    serde_json::to_string(&records).unwrap_or("[]".into())
}

/// Convert JSON array string to CSV string
#[napi]
pub fn json_to_csv(json_str: String) -> String {
    let data: serde_json::Value = serde_json::from_str(&json_str).unwrap_or(serde_json::Value::Null);
    let items = match data {
        serde_json::Value::Array(arr) => arr,
        _ => return String::new(),
    };
    if items.is_empty() { return String::new(); }

    let mut headers: Vec<String> = Vec::new();
    for item in &items {
        if let serde_json::Value::Object(map) = item {
            for key in map.keys() {
                if !headers.contains(key) { headers.push(key.clone()); }
            }
        }
    }

    let mut out = headers.join(",");
    out.push('\n');
    for item in &items {
        let row: Vec<String> = headers.iter().map(|h| {
            match item.get(h) {
                Some(serde_json::Value::String(s)) => {
                    if s.contains(',') || s.contains('"') || s.contains('\n') {
                        format!("\"{}\"", s.replace('"', "\"\""))
                    } else { s.clone() }
                }
                Some(serde_json::Value::Null) | None => String::new(),
                Some(v) => v.to_string(),
            }
        }).collect();
        out.push_str(&row.join(","));
        out.push('\n');
    }
    out
}
