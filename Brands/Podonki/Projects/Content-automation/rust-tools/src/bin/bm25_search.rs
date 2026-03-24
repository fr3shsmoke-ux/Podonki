use std::collections::HashMap;
use std::io::{self, Read};

use chrono::Utc;
use clap::Parser;
use serde::{Deserialize, Serialize};

/// BM25+ search with temporal decay — Rust port of bm25-search.js
#[derive(Parser)]
#[command(name = "bm25-search", about = "BM25+ full-text search with temporal decay")]
struct Cli {
    /// Search query (single mode)
    #[arg(short, long)]
    query: Option<String>,

    /// Max results to return
    #[arg(short, long, default_value = "5")]
    limit: usize,

    /// BM25 k1 parameter
    #[arg(long, default_value = "1.5")]
    k1: f64,

    /// BM25 b parameter
    #[arg(long, default_value = "0.75")]
    b: f64,

    /// Half-life in days for temporal decay
    #[arg(long, default_value = "30")]
    half_life: f64,

    /// Batch mode: read {documents, queries} from stdin
    #[arg(long)]
    batch: bool,
}

#[derive(Deserialize, Clone)]
struct InputDoc {
    id: String,
    text: String,
    date: Option<String>,
    created_at: Option<String>,
    timestamp: Option<String>,
    #[serde(flatten)]
    extra: serde_json::Value,
}

#[derive(Deserialize)]
struct BatchInput {
    documents: Vec<InputDoc>,
    queries: Vec<BatchQuery>,
    k1: Option<f64>,
    b: Option<f64>,
    half_life: Option<f64>,
}

#[derive(Deserialize)]
struct BatchQuery {
    query: String,
    limit: Option<usize>,
}

#[derive(Serialize)]
struct SearchResult {
    id: String,
    score: f64,
    #[serde(flatten)]
    extra: serde_json::Value,
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

struct IndexEntry {
    doc_idx: usize,
    freq: u32,
}

struct BM25Index {
    docs: Vec<InputDoc>,
    doc_lengths: Vec<usize>,
    index: HashMap<String, Vec<IndexEntry>>,
    avg_doc_length: f64,
    doc_dates: Vec<Option<String>>,
}

impl BM25Index {
    fn build(docs: Vec<InputDoc>) -> Self {
        let mut doc_lengths = Vec::with_capacity(docs.len());
        let mut index: HashMap<String, Vec<IndexEntry>> = HashMap::new();
        let mut total_length: usize = 0;
        let mut doc_dates = Vec::with_capacity(docs.len());

        for (i, doc) in docs.iter().enumerate() {
            let tokens = tokenize(&doc.text);
            let len = tokens.len();
            total_length += len;

            let date = doc.date.as_ref()
                .or(doc.created_at.as_ref())
                .or(doc.timestamp.as_ref())
                .cloned();
            doc_dates.push(date);

            let mut term_freq: HashMap<&str, u32> = HashMap::new();
            for token in &tokens {
                *term_freq.entry(token.as_str()).or_insert(0) += 1;
            }

            for (term, freq) in term_freq {
                index.entry(term.to_string())
                    .or_default()
                    .push(IndexEntry { doc_idx: i, freq });
            }

            doc_lengths.push(len);
        }

        let n = docs.len();
        let avg_doc_length = if n > 0 { total_length as f64 / n as f64 } else { 0.0 };

        BM25Index { docs, doc_lengths, index, avg_doc_length, doc_dates }
    }

    fn search(&self, query: &str, limit: usize, k1: f64, b: f64, half_life: f64) -> Vec<SearchResult> {
        let query_tokens = tokenize(query);
        if query_tokens.is_empty() || self.docs.is_empty() {
            return vec![];
        }

        let n = self.docs.len() as f64;
        let mut scores = vec![0.0_f64; self.docs.len()];

        for term in &query_tokens {
            if let Some(postings) = self.index.get(term) {
                let df = postings.len() as f64;
                let idf = ((n - df + 0.5) / (df + 0.5) + 1.0).ln();

                for entry in postings {
                    let tf = entry.freq as f64;
                    let doc_len = self.doc_lengths[entry.doc_idx] as f64;

                    let numerator = tf * (k1 + 1.0);
                    let denominator = tf + k1 * (1.0 - b + b * (doc_len / self.avg_doc_length));
                    let bm25_score = idf * (numerator / denominator + 1.0);

                    let decay = temporal_decay(&self.doc_dates[entry.doc_idx], half_life);
                    scores[entry.doc_idx] += bm25_score * decay;
                }
            }
        }

        let mut results: Vec<(usize, f64)> = scores.iter()
            .enumerate()
            .filter(|(_, &s)| s > 0.0)
            .map(|(i, &s)| (i, s))
            .collect();

        results.sort_by(|a, b_val| b_val.1.partial_cmp(&a.1).unwrap());
        results.truncate(limit);

        results.into_iter()
            .map(|(i, score)| SearchResult {
                id: self.docs[i].id.clone(),
                score,
                extra: self.docs[i].extra.clone(),
            })
            .collect()
    }
}

fn main() {
    let cli = Cli::parse();

    let mut input = String::new();
    io::stdin().read_to_string(&mut input).expect("Failed to read stdin");

    if cli.batch {
        // Batch mode: build index once, run multiple queries
        let batch: BatchInput = serde_json::from_str(&input).expect("Invalid batch JSON");
        let k1 = batch.k1.unwrap_or(cli.k1);
        let b = batch.b.unwrap_or(cli.b);
        let half_life = batch.half_life.unwrap_or(cli.half_life);

        let index = BM25Index::build(batch.documents);

        let results: Vec<Vec<SearchResult>> = batch.queries.iter()
            .map(|q| index.search(&q.query, q.limit.unwrap_or(cli.limit), k1, b, half_life))
            .collect();

        println!("{}", serde_json::to_string(&results).unwrap());
    } else {
        // Single query mode
        let query = cli.query.unwrap_or_default();
        let docs: Vec<InputDoc> = serde_json::from_str(&input).expect("Invalid JSON input");
        let index = BM25Index::build(docs);
        let results = index.search(&query, cli.limit, cli.k1, cli.b, cli.half_life);
        println!("{}", serde_json::to_string(&results).unwrap());
    }
}
