use std::collections::HashMap;
use std::io::{self, Read};

use clap::Parser;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;

/// HTML Parser — extracts posts from Telegram HTML export
#[derive(Parser)]
#[command(name = "html-parser", about = "Parse Telegram HTML export into structured JSON")]
struct Cli {
    /// Input HTML file (or stdin)
    #[arg(short, long)]
    input: Option<String>,

    /// Output JSON file (or stdout)
    #[arg(short, long)]
    output: Option<String>,

    /// Pretty print JSON output
    #[arg(long)]
    pretty: bool,
}

#[derive(Serialize)]
struct ParsedPost {
    id: usize,
    date: String,
    text: String,
    has_media: bool,
    reactions: HashMap<String, u32>,
    engagement_score: u32,
}

#[derive(Serialize)]
struct ParseResult {
    channel: String,
    total_posts: usize,
    posts: Vec<ParsedPost>,
}

// Pre-compiled regexes
// We'll split by message divs manually instead of using lookahead

static DATE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"title="([^"]+)""#).unwrap()
});

static TEXT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"<div class="text">([\s\S]*?)</div>"#).unwrap()
});

static REACTION_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"<span class="emoji">\s*([\s\S]*?)\s*</span>\s*<span class="count">(\d+)</span>"#).unwrap()
});

static MEDIA_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"<(?:img|video|audio)[^>]*>"#).unwrap()
});

static TAG_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"<[^>]+>").unwrap()
});

static MULTI_SPACE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"  +").unwrap()
});

static MULTI_NEWLINE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\n{3,}").unwrap()
});

fn decode_html_entities(text: &str) -> String {
    text.replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&amp;", "&")
        .replace("&#039;", "'")
}

fn strip_tags(html: &str) -> String {
    // Replace <br> with newline first
    let text = html.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n");
    let text = TAG_RE.replace_all(&text, "");
    let text = decode_html_entities(&text);
    let text = MULTI_SPACE_RE.replace_all(&text, " ");
    let text = MULTI_NEWLINE_RE.replace_all(&text, "\n\n");
    text.trim().to_string()
}

fn main() {
    let cli = Cli::parse();

    let html = if let Some(ref path) = cli.input {
        std::fs::read_to_string(path).expect("Failed to read input file")
    } else {
        let mut s = String::new();
        io::stdin().read_to_string(&mut s).expect("Failed to read stdin");
        s
    };

    let mut posts = Vec::new();

    // Split HTML into message blocks manually (no lookahead needed)
    let msg_start_re = Regex::new(r#"<div class="message default clearfix"[^>]*id="message(\d+)">"#).unwrap();
    let starts: Vec<(usize, usize)> = msg_start_re.captures_iter(&html).map(|cap| {
        let m = cap.get(0).unwrap();
        let id: usize = cap[1].parse().unwrap_or(0);
        (m.start(), id)
    }).collect();

    for (i, &(start, msg_id)) in starts.iter().enumerate() {
        let end = if i + 1 < starts.len() { starts[i + 1].0 } else { html.len() };
        let block = &html[start..end];

        // Extract date
        let date = DATE_RE.captures(block)
            .map(|c| c[1].to_string())
            .unwrap_or_default();

        // Extract text
        let text = TEXT_RE.captures(block)
            .map(|c| strip_tags(&c[1]))
            .unwrap_or_default();

        // Check for media
        let has_media = MEDIA_RE.is_match(block);

        // Extract reactions
        let mut reactions: HashMap<String, u32> = HashMap::new();
        let mut engagement_score: u32 = 0;
        for rcap in REACTION_RE.captures_iter(block) {
            let emoji = rcap[1].trim().to_string();
            let count: u32 = rcap[2].parse().unwrap_or(0);
            reactions.insert(emoji, count);
            engagement_score += count;
        }

        if !text.is_empty() || has_media {
            posts.push(ParsedPost {
                id: msg_id,
                date,
                text,
                has_media,
                reactions,
                engagement_score,
            });
        }
    }

    let result = ParseResult {
        channel: "Telegram HTML Export".to_string(),
        total_posts: posts.len(),
        posts,
    };

    let json = if cli.pretty {
        serde_json::to_string_pretty(&result).unwrap()
    } else {
        serde_json::to_string(&result).unwrap()
    };

    if let Some(ref path) = cli.output {
        std::fs::write(path, &json).expect("Failed to write output");
        eprintln!("Parsed {} posts → {}", result.total_posts, path);
    } else {
        println!("{json}");
    }
}
