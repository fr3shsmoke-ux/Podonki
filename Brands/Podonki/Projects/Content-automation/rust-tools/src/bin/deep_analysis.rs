use std::collections::HashMap;
use std::io::{self, Read};

use chrono::{DateTime, Datelike, Timelike, Utc};
use clap::Parser;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

// Pre-compiled regexes
static LIST_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"[✅🟢➖•\-]\s*\S").unwrap());
static NUM_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\d[.)\s]").unwrap());
static URL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"https?://\S+").unwrap());
static MENTION_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"@[\w]+").unwrap());
static SENT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"[.!?…]+").unwrap());
static TY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\b(?:ты|тебе|тебя|твой|твоей|твоих|твоему)\b").unwrap());
static VY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\b(?:вы|вам|вас|ваш|вашей|ваших|вашему)\b").unwrap());

struct CompiledCtas {
    patterns: Vec<(&'static str, Regex)>,
}

static CTA_PATTERNS: Lazy<CompiledCtas> = Lazy::new(|| {
    CompiledCtas {
        patterns: vec![
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
        ],
    }
});

/// Deep Analysis — fast post analyzer for Telegram channel data
#[derive(Parser)]
#[command(name = "deep-analysis", about = "Analyze Telegram posts: tone, structure, categories, products")]
struct Cli {
    /// Input JSON file (or stdin if not specified)
    #[arg(short, long)]
    input: Option<String>,

    /// Output JSON file (or stdout if not specified)
    #[arg(short, long)]
    output: Option<String>,
}

#[derive(Deserialize)]
struct ChannelData {
    posts: Vec<Post>,
}

#[derive(Deserialize, Clone)]
struct Post {
    id: serde_json::Value,
    text: String,
    date: String,
    has_media: bool,
}

#[derive(Serialize)]
struct Report {
    overview: Overview,
    tone: ToneAnalysis,
    emojis: EmojiAnalysis,
    structure: StructureAnalysis,
    categories: HashMap<String, CategoryStats>,
    products: ProductAnalysis,
    cta: CtaAnalysis,
    temporal: TemporalAnalysis,
    posting_rhythm: RhythmAnalysis,
}

#[derive(Serialize)]
struct Overview {
    total_posts: usize,
    avg_length: f64,
    median_length: f64,
    with_media: usize,
    media_rate: f64,
    length_distribution: HashMap<String, usize>,
}

#[derive(Serialize)]
struct ToneAnalysis {
    casual_posts_count: usize,
    casual_posts_pct: f64,
    formal_posts_count: usize,
    formal_posts_pct: f64,
    avg_casual_score: f64,
    top_casual_words: Vec<(String, usize)>,
    addressing: HashMap<String, usize>,
}

#[derive(Serialize)]
struct EmojiAnalysis {
    total_emoji_usage: usize,
    unique_emojis: usize,
    avg_emoji_per_post: f64,
    posts_with_emoji_pct: f64,
    top_20: Vec<(String, usize)>,
}

#[derive(Serialize)]
struct StructureAnalysis {
    avg_score: f64,
    median_score: f64,
    with_paragraphs_pct: f64,
    with_lists_pct: f64,
    with_questions_pct: f64,
    avg_sentences: f64,
}

#[derive(Serialize)]
struct CategoryStats {
    count: usize,
    pct: f64,
    avg_length: f64,
}

#[derive(Serialize)]
struct ProductAnalysis {
    total_product_posts: usize,
    product_post_rate_pct: f64,
    product_frequency: Vec<(String, usize)>,
}

#[derive(Serialize)]
struct CtaAnalysis {
    posts_with_cta: usize,
    cta_rate_pct: f64,
    cta_frequency: Vec<(String, usize)>,
}

#[derive(Serialize)]
struct TemporalAnalysis {
    by_day_of_week: HashMap<String, usize>,
    by_hour: HashMap<String, usize>,
    busiest_day: String,
}

#[derive(Serialize)]
struct RhythmAnalysis {
    avg_gap_hours: f64,
    median_gap_hours: f64,
    posts_per_week_avg: f64,
}

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

const DAYS_RU: &[&str] = &[
    "Понедельник", "Вторник", "Среда", "Четверг",
    "Пятница", "Суббота", "Воскресенье",
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

fn count_emojis(text: &str) -> usize {
    text.chars().filter(|&c| is_emoji(c)).count()
}

fn extract_emojis(text: &str) -> Vec<String> {
    text.chars().filter(|&c| is_emoji(c)).map(|c| c.to_string()).collect()
}

fn casual_score(text: &str) -> usize {
    let lower = text.to_lowercase();
    CASUAL_MARKERS.iter().filter(|m| lower.contains(*m)).count()
}

fn formal_score(text: &str) -> usize {
    let lower = text.to_lowercase();
    FORMAL_MARKERS.iter().filter(|m| lower.contains(*m)).count()
}

fn has_question(text: &str) -> bool {
    text.contains('?') || text.contains('❓')
}

fn has_list_markers(text: &str) -> bool {
    LIST_RE.is_match(text) || NUM_RE.is_match(text)
}

fn has_paragraphs(text: &str) -> bool {
    text.contains("\n\n") || text.matches('\n').count() >= 3
}

fn count_sentences(text: &str) -> usize {
    let clean = URL_RE.replace_all(text, "");
    let clean = MENTION_RE.replace_all(&clean, "");
    SENT_RE.split(&clean)
        .filter(|s| s.trim().len() > 5)
        .count()
}

fn structure_score(text: &str) -> f64 {
    let mut score: f64 = 0.0;
    if has_paragraphs(text) { score += 1.0; }
    if has_list_markers(text) { score += 1.0; }
    if has_question(text) { score += 0.5; }
    if count_emojis(text) > 0 { score += 0.5; }
    let n_lines = text.matches('\n').count();
    if n_lines >= 5 { score += 1.0; } else if n_lines >= 2 { score += 0.5; }
    if text.len() > 300 { score += 0.5; }
    score.min(5.0)
}

fn addressing_style(text: &str) -> String {
    let lower = text.to_lowercase();
    let ty = TY_RE.find_iter(&lower).count();
    let vy = VY_RE.find_iter(&lower).count();
    if ty > vy { "ты".into() }
    else if vy > ty { "вы".into() }
    else if ty > 0 { "mixed".into() }
    else { "none".into() }
}

fn find_products(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let products: Vec<(&str, &[&str])> = vec![
        ("Конструктор", &["конструктор", "pdnk конструктор"] as &[&str]),
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
    let mut found = Vec::new();
    for (name, keywords) in products {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            found.push(name.to_string());
        }
    }
    found
}

fn find_ctas(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut found = Vec::new();
    for (label, re) in &CTA_PATTERNS.patterns {
        if re.is_match(&lower) {
            found.push(label.to_string());
        }
    }
    found
}

fn classify_post(text: &str, has_media: bool) -> String {
    let lower = text.to_lowercase();
    let length = text.len();
    let products = find_products(text);

    if length < 50 && has_media { return "media_only".into(); }
    if length < 80 && products.is_empty() { return "engagement".into(); }

    let quiz_markers = ["угадай", "какой вкус", "викторин", "загадк", "отгадай", "правильный ответ", "голосуй"];
    if quiz_markers.iter().any(|m| lower.contains(m)) { return "quiz_game".into(); }

    let contest_markers = ["розыгрыш", "конкурс", "приз", "победител", "разыгры", "участвуй", "условия", "подпис", "репост"];
    if contest_markers.iter().filter(|m| lower.contains(*m)).count() >= 2 { return "promo_contest".into(); }

    let meme_markers = ["💀", "😂", "🤣", "ору", "мем", "ахах", "ахаха", "прикол"];
    if length < 200 && meme_markers.iter().any(|m| lower.contains(m) || text.contains(m)) { return "meme_fun".into(); }

    let detail_markers = ["вкус", "крепость", "линейка", "мг", "что такое", "что внутри", "фаворит"];
    if !products.is_empty() && length > 200 && detail_markers.iter().filter(|m| lower.contains(*m)).count() >= 2 {
        return "product_desc".into();
    }

    if !products.is_empty() {
        let ctas = find_ctas(text);
        if !ctas.is_empty() || ["купи", "забери", "попробуй", "менеджер"].iter().any(|m| lower.contains(m)) {
            return "promo_contest".into();
        }
    }

    let edu_markers = ["что такое", "почему", "как работает", "совет", "гайд", "правил", "объясня", "расскажем"];
    if edu_markers.iter().any(|m| lower.contains(m)) && length > 150 { return "info_edu".into(); }

    let announce_markers = ["внимание", "анонс", "новост", "обновлен", "важно", "‼️", "⚡️", "🚨", "❗"];
    if announce_markers.iter().any(|m| lower.contains(m) || text.contains(m)) { return "announcement".into(); }

    let fun_markers = ["поздравля", "праздник", "с днём", "с новым", "с 8 март", "настроен", "история"];
    if fun_markers.iter().any(|m| lower.contains(m)) { return "entertainment".into(); }

    if length < 100 { return "engagement".into(); }
    if !products.is_empty() { return "promo_contest".into(); }
    if has_list_markers(text) || has_paragraphs(text) { return "info_edu".into(); }

    "promo_contest".into()
}

fn parse_date(s: &str) -> Option<DateTime<Utc>> {
    chrono::DateTime::parse_from_rfc3339(s)
        .or_else(|_| chrono::DateTime::parse_from_rfc3339(&format!("{}Z", s.trim_end_matches('Z'))))
        .map(|dt| dt.with_timezone(&Utc))
        .ok()
        .or_else(|| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
                .map(|dt| dt.and_utc())
                .ok()
        })
}

fn median(sorted: &[f64]) -> f64 {
    if sorted.is_empty() { return 0.0; }
    let n = sorted.len();
    if n % 2 == 0 { (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0 }
    else { sorted[n / 2] }
}

fn round1(v: f64) -> f64 { (v * 10.0).round() / 10.0 }
fn round2(v: f64) -> f64 { (v * 100.0).round() / 100.0 }

fn main() {
    let cli = Cli::parse();

    let input_data = if let Some(ref path) = cli.input {
        std::fs::read_to_string(path).expect("Failed to read input file")
    } else {
        let mut s = String::new();
        io::stdin().read_to_string(&mut s).expect("Failed to read stdin");
        s
    };

    let posts: Vec<Post> = if let Ok(channels) = serde_json::from_str::<Vec<ChannelData>>(&input_data) {
        channels.into_iter().flat_map(|c| c.posts).collect()
    } else {
        serde_json::from_str(&input_data).expect("Invalid JSON: expected [{posts: [...]}] or [posts]")
    };

    let n = posts.len();
    if n == 0 {
        eprintln!("No posts found");
        std::process::exit(1);
    }

    let mut lengths: Vec<f64> = Vec::with_capacity(n);
    let mut casual_scores: Vec<usize> = Vec::with_capacity(n);
    let mut formal_scores: Vec<usize> = Vec::with_capacity(n);
    let mut struct_scores: Vec<f64> = Vec::with_capacity(n);
    let mut emoji_counts: Vec<usize> = Vec::with_capacity(n);
    let mut all_emojis: HashMap<String, usize> = HashMap::new();
    let mut categories: HashMap<String, usize> = HashMap::new();
    let mut cat_lengths: HashMap<String, Vec<f64>> = HashMap::new();
    let mut casual_words: HashMap<String, usize> = HashMap::new();
    let mut addressing_counts: HashMap<String, usize> = HashMap::new();
    let mut all_products: HashMap<String, usize> = HashMap::new();
    let mut product_post_count = 0usize;
    let mut all_ctas: HashMap<String, usize> = HashMap::new();
    let mut cta_post_count = 0usize;
    let mut dow_counts: HashMap<String, usize> = HashMap::new();
    let mut hour_counts: HashMap<String, usize> = HashMap::new();
    let mut with_media = 0usize;
    let mut with_question = 0usize;
    let mut with_list = 0usize;
    let mut with_paragraphs = 0usize;
    let mut with_emoji = 0usize;
    let mut sentence_counts: Vec<f64> = Vec::with_capacity(n);
    let mut dates: Vec<DateTime<Utc>> = Vec::with_capacity(n);

    for post in &posts {
        let text = &post.text;
        let len = text.len() as f64;
        lengths.push(len);

        let cs = casual_score(text);
        casual_scores.push(cs);
        formal_scores.push(formal_score(text));

        let ss = structure_score(text);
        struct_scores.push(ss);

        let ec = count_emojis(text);
        emoji_counts.push(ec);
        if ec > 0 { with_emoji += 1; }

        for e in extract_emojis(text) {
            *all_emojis.entry(e).or_insert(0) += 1;
        }

        let cat = classify_post(text, post.has_media);
        *categories.entry(cat.clone()).or_insert(0) += 1;
        cat_lengths.entry(cat).or_default().push(len);

        if post.has_media { with_media += 1; }
        if has_question(text) { with_question += 1; }
        if has_list_markers(text) { with_list += 1; }
        if has_paragraphs(text) { with_paragraphs += 1; }

        sentence_counts.push(count_sentences(text) as f64);

        let lower = text.to_lowercase();
        for m in CASUAL_MARKERS {
            if lower.contains(m) {
                *casual_words.entry(m.to_string()).or_insert(0) += 1;
            }
        }

        let addr = addressing_style(text);
        *addressing_counts.entry(addr).or_insert(0) += 1;

        let prods = find_products(text);
        if !prods.is_empty() { product_post_count += 1; }
        for p in prods {
            *all_products.entry(p).or_insert(0) += 1;
        }

        let ctas = find_ctas(text);
        if !ctas.is_empty() { cta_post_count += 1; }
        for c in ctas {
            *all_ctas.entry(c).or_insert(0) += 1;
        }

        if let Some(dt) = parse_date(&post.date) {
            let dow = dt.weekday().num_days_from_monday() as usize;
            *dow_counts.entry(DAYS_RU[dow].to_string()).or_insert(0) += 1;
            *hour_counts.entry(format!("{:02}:00", dt.hour())).or_insert(0) += 1;
            dates.push(dt);
        }
    }

    let nf = n as f64;

    let mut length_dist: HashMap<String, usize> = HashMap::new();
    for &l in &lengths {
        let bucket = if l < 100.0 { "<100" }
            else if l < 300.0 { "100-300" }
            else if l < 500.0 { "300-500" }
            else if l < 1000.0 { "500-1000" }
            else if l < 1500.0 { "1000-1500" }
            else { "1500+" };
        *length_dist.entry(bucket.to_string()).or_insert(0) += 1;
    }

    let mut sorted_lengths = lengths.clone();
    sorted_lengths.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg_length = lengths.iter().sum::<f64>() / nf;
    let median_length = median(&sorted_lengths);

    let mut casual_vec: Vec<(String, usize)> = casual_words.into_iter().collect();
    casual_vec.sort_by(|a, b| b.1.cmp(&a.1));
    casual_vec.truncate(15);

    let mut emoji_vec: Vec<(String, usize)> = all_emojis.into_iter().collect();
    emoji_vec.sort_by(|a, b| b.1.cmp(&a.1));
    let total_emoji_usage: usize = emoji_vec.iter().map(|(_, c)| c).sum();
    let unique_emojis = emoji_vec.len();
    emoji_vec.truncate(20);

    let mut cat_stats: HashMap<String, CategoryStats> = HashMap::new();
    for (cat, count) in &categories {
        let cat_lens = cat_lengths.get(cat).unwrap();
        let avg = cat_lens.iter().sum::<f64>() / cat_lens.len() as f64;
        cat_stats.insert(cat.clone(), CategoryStats {
            count: *count,
            pct: round2(*count as f64 / nf * 100.0),
            avg_length: round1(avg),
        });
    }

    let mut sorted_struct = struct_scores.clone();
    sorted_struct.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg_struct = struct_scores.iter().sum::<f64>() / nf;
    let avg_sentences = sentence_counts.iter().sum::<f64>() / nf;

    let mut prod_vec: Vec<(String, usize)> = all_products.into_iter().collect();
    prod_vec.sort_by(|a, b| b.1.cmp(&a.1));

    let mut cta_vec: Vec<(String, usize)> = all_ctas.into_iter().collect();
    cta_vec.sort_by(|a, b| b.1.cmp(&a.1));

    let busiest_day = dow_counts.iter()
        .max_by_key(|(_, &v)| v)
        .map(|(k, _)| k.clone())
        .unwrap_or_default();

    dates.sort();
    let mut gaps: Vec<f64> = Vec::new();
    for i in 1..dates.len() {
        let gap = (dates[i] - dates[i - 1]).num_seconds() as f64 / 3600.0;
        gaps.push(gap);
    }
    gaps.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let avg_gap = if gaps.is_empty() { 0.0 } else { gaps.iter().sum::<f64>() / gaps.len() as f64 };
    let median_gap = median(&gaps);

    let total_days = if dates.len() >= 2 {
        (dates.last().unwrap().signed_duration_since(*dates.first().unwrap())).num_days() as f64
    } else { 1.0 };
    let posts_per_week = n as f64 / (total_days / 7.0).max(1.0);

    let report = Report {
        overview: Overview {
            total_posts: n,
            avg_length: round1(avg_length),
            median_length: round1(median_length),
            with_media,
            media_rate: round1(with_media as f64 / nf * 100.0),
            length_distribution: length_dist,
        },
        tone: ToneAnalysis {
            casual_posts_count: casual_scores.iter().filter(|&&s| s > 0).count(),
            casual_posts_pct: round1(casual_scores.iter().filter(|&&s| s > 0).count() as f64 / nf * 100.0),
            formal_posts_count: formal_scores.iter().filter(|&&s| s > 0).count(),
            formal_posts_pct: round1(formal_scores.iter().filter(|&&s| s > 0).count() as f64 / nf * 100.0),
            avg_casual_score: round2(casual_scores.iter().sum::<usize>() as f64 / nf),
            top_casual_words: casual_vec,
            addressing: addressing_counts,
        },
        emojis: EmojiAnalysis {
            total_emoji_usage,
            unique_emojis,
            avg_emoji_per_post: round1(emoji_counts.iter().sum::<usize>() as f64 / nf),
            posts_with_emoji_pct: round1(with_emoji as f64 / nf * 100.0),
            top_20: emoji_vec,
        },
        structure: StructureAnalysis {
            avg_score: round2(avg_struct),
            median_score: round2(median(&sorted_struct)),
            with_paragraphs_pct: round1(with_paragraphs as f64 / nf * 100.0),
            with_lists_pct: round1(with_list as f64 / nf * 100.0),
            with_questions_pct: round1(with_question as f64 / nf * 100.0),
            avg_sentences: round1(avg_sentences),
        },
        categories: cat_stats,
        products: ProductAnalysis {
            total_product_posts: product_post_count,
            product_post_rate_pct: round1(product_post_count as f64 / nf * 100.0),
            product_frequency: prod_vec,
        },
        cta: CtaAnalysis {
            posts_with_cta: cta_post_count,
            cta_rate_pct: round1(cta_post_count as f64 / nf * 100.0),
            cta_frequency: cta_vec,
        },
        temporal: TemporalAnalysis {
            by_day_of_week: dow_counts,
            by_hour: hour_counts,
            busiest_day,
        },
        posting_rhythm: RhythmAnalysis {
            avg_gap_hours: round1(avg_gap),
            median_gap_hours: round1(median_gap),
            posts_per_week_avg: round1(posts_per_week),
        },
    };

    let json = serde_json::to_string_pretty(&report).unwrap();

    if let Some(ref path) = cli.output {
        std::fs::write(path, &json).expect("Failed to write output");
        eprintln!("Report written to {path}");
    } else {
        println!("{json}");
    }
}
