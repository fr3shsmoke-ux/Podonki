use std::io::{self, Read};

use clap::{Parser, Subcommand};
use serde_json::Value;

/// CSV Converter — fast bidirectional CSV↔JSON conversion
#[derive(Parser)]
#[command(name = "csv-converter", about = "Convert between CSV and JSON formats")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Convert CSV to JSON array of objects
    ToJson {
        #[arg(short, long)]
        input: Option<String>,
        #[arg(short, long)]
        output: Option<String>,
        /// CSV delimiter
        #[arg(short, long, default_value = ",")]
        delimiter: char,
        /// Pretty print
        #[arg(long)]
        pretty: bool,
    },
    /// Convert JSON array to CSV
    ToCsv {
        #[arg(short, long)]
        input: Option<String>,
        #[arg(short, long)]
        output: Option<String>,
        /// JSON path to array (dot-separated)
        #[arg(short, long)]
        path: Option<String>,
        /// CSV delimiter
        #[arg(short, long, default_value = ",")]
        delimiter: char,
    },
    /// Show CSV stats (rows, columns, preview)
    Stats {
        #[arg(short, long)]
        input: Option<String>,
    },
}

fn read_input(input: &Option<String>) -> String {
    if let Some(ref path) = input {
        std::fs::read_to_string(path).expect("Failed to read input file")
    } else {
        let mut s = String::new();
        io::stdin().read_to_string(&mut s).expect("Failed to read stdin");
        s
    }
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Command::ToJson { input, output, delimiter, pretty } => {
            let data = read_input(&input);
            let mut reader = csv::ReaderBuilder::new()
                .delimiter(delimiter as u8)
                .from_reader(data.as_bytes());

            let headers: Vec<String> = reader.headers()
                .expect("No headers found")
                .iter()
                .map(|h| h.to_string())
                .collect();

            let mut records: Vec<serde_json::Map<String, Value>> = Vec::new();
            for result in reader.records() {
                let record = result.expect("Invalid CSV record");
                let mut obj = serde_json::Map::new();
                for (i, field) in record.iter().enumerate() {
                    if i < headers.len() {
                        // Try to parse as number/bool, fallback to string
                        let value = if let Ok(n) = field.parse::<i64>() {
                            Value::Number(n.into())
                        } else if let Ok(n) = field.parse::<f64>() {
                            Value::Number(serde_json::Number::from_f64(n).unwrap_or(0.into()))
                        } else if field == "true" || field == "false" {
                            Value::Bool(field == "true")
                        } else {
                            Value::String(field.to_string())
                        };
                        obj.insert(headers[i].clone(), value);
                    }
                }
                records.push(obj);
            }

            let json = if pretty {
                serde_json::to_string_pretty(&records).unwrap()
            } else {
                serde_json::to_string(&records).unwrap()
            };

            if let Some(ref out) = output {
                std::fs::write(out, &json).expect("Failed to write");
                eprintln!("Converted {} rows → {}", records.len(), out);
            } else {
                println!("{json}");
            }
        }

        Command::ToCsv { input, output, path, delimiter } => {
            let data = read_input(&input);
            let json: Value = serde_json::from_str(&data).expect("Invalid JSON");

            let items = if let Some(ref p) = path {
                let mut current = &json;
                for key in p.split('.') {
                    if let Ok(idx) = key.parse::<usize>() {
                        current = &current[idx];
                    } else {
                        current = &current[key];
                    }
                }
                current.as_array().expect("Path does not point to array").clone()
            } else {
                json.as_array().expect("Root is not array").clone()
            };

            if items.is_empty() {
                eprintln!("No items to convert");
                return;
            }

            // Collect all unique keys maintaining order
            let mut headers: Vec<String> = Vec::new();
            for item in &items {
                if let Value::Object(map) = item {
                    for key in map.keys() {
                        if !headers.contains(key) {
                            headers.push(key.clone());
                        }
                    }
                }
            }

            let mut csv_out = String::new();
            csv_out.push_str(&headers.join(&delimiter.to_string()));
            csv_out.push('\n');

            for item in &items {
                let row: Vec<String> = headers.iter().map(|h| {
                    match item.get(h) {
                        Some(Value::String(s)) => {
                            if s.contains(delimiter) || s.contains('"') || s.contains('\n') {
                                format!("\"{}\"", s.replace('"', "\"\""))
                            } else {
                                s.clone()
                            }
                        }
                        Some(Value::Null) | None => String::new(),
                        Some(v) => v.to_string(),
                    }
                }).collect();
                csv_out.push_str(&row.join(&delimiter.to_string()));
                csv_out.push('\n');
            }

            if let Some(ref out) = output {
                std::fs::write(out, &csv_out).expect("Failed to write");
                eprintln!("Converted {} items → {}", items.len(), out);
            } else {
                print!("{csv_out}");
            }
        }

        Command::Stats { input } => {
            let data = read_input(&input);
            let mut reader = csv::ReaderBuilder::new()
                .from_reader(data.as_bytes());

            let headers: Vec<String> = reader.headers()
                .expect("No headers")
                .iter()
                .map(|h| h.to_string())
                .collect();

            let mut row_count = 0usize;
            for result in reader.records() {
                let _ = result.expect("Invalid record");
                row_count += 1;
            }

            println!("Columns: {} ({:?})", headers.len(), headers);
            println!("Rows: {}", row_count);
        }
    }
}
