use std::io::{self, Read};

use clap::{Parser, Subcommand};
use serde_json::Value;

/// JSON Processor — fast JSON querying, filtering, and transformation
#[derive(Parser)]
#[command(name = "json-processor", about = "Fast JSON processing: query, filter, stats, merge")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Get stats about JSON structure
    Stats {
        #[arg(short, long)]
        input: Option<String>,
    },
    /// Filter array items by field value
    Filter {
        #[arg(short, long)]
        input: Option<String>,
        /// JSON path to array (dot-separated, e.g. "products")
        #[arg(short, long)]
        path: Option<String>,
        /// Field to filter on
        #[arg(short, long)]
        field: String,
        /// Value to match (substring)
        #[arg(short, long)]
        value: String,
        /// Output file
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Extract unique values of a field
    Unique {
        #[arg(short, long)]
        input: Option<String>,
        #[arg(short, long)]
        path: Option<String>,
        #[arg(short, long)]
        field: String,
    },
    /// Count items grouped by a field
    GroupBy {
        #[arg(short, long)]
        input: Option<String>,
        #[arg(short, long)]
        path: Option<String>,
        #[arg(short, long)]
        field: String,
    },
    /// Merge multiple JSON files
    Merge {
        /// Input files
        files: Vec<String>,
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Extract a nested path from JSON
    Get {
        #[arg(short, long)]
        input: Option<String>,
        /// Dot-separated path (e.g. "products.0.name")
        #[arg(short, long)]
        path: String,
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

fn navigate_path(value: &Value, path: &str) -> Value {
    if path.is_empty() {
        return value.clone();
    }
    let mut current = value;
    for key in path.split('.') {
        if let Ok(idx) = key.parse::<usize>() {
            current = &current[idx];
        } else {
            current = &current[key];
        }
    }
    current.clone()
}

fn get_array(value: &Value, path: &Option<String>) -> Vec<Value> {
    let target = if let Some(ref p) = path {
        navigate_path(value, p)
    } else {
        value.clone()
    };
    match target {
        Value::Array(arr) => arr,
        _ => vec![target],
    }
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Command::Stats { input } => {
            let data = read_input(&input);
            let value: Value = serde_json::from_str(&data).expect("Invalid JSON");
            print_stats(&value, "", 0);
        }

        Command::Filter { input, path, field, value, output } => {
            let data = read_input(&input);
            let json: Value = serde_json::from_str(&data).expect("Invalid JSON");
            let items = get_array(&json, &path);
            let filtered: Vec<&Value> = items.iter().filter(|item| {
                if let Some(fv) = item.get(&field) {
                    let s = match fv {
                        Value::String(s) => s.to_lowercase(),
                        _ => fv.to_string().to_lowercase(),
                    };
                    s.contains(&value.to_lowercase())
                } else {
                    false
                }
            }).collect();

            let result = serde_json::to_string_pretty(&filtered).unwrap();
            if let Some(ref out) = output {
                std::fs::write(out, &result).expect("Failed to write");
                eprintln!("Filtered {} → {} items → {}", items.len(), filtered.len(), out);
            } else {
                println!("{result}");
            }
        }

        Command::Unique { input, path, field } => {
            let data = read_input(&input);
            let json: Value = serde_json::from_str(&data).expect("Invalid JSON");
            let items = get_array(&json, &path);
            let mut values: Vec<String> = items.iter()
                .filter_map(|item| item.get(&field))
                .map(|v| match v {
                    Value::String(s) => s.clone(),
                    _ => v.to_string(),
                })
                .collect();
            values.sort();
            values.dedup();
            for v in &values {
                println!("{v}");
            }
            eprintln!("{} unique values", values.len());
        }

        Command::GroupBy { input, path, field } => {
            let data = read_input(&input);
            let json: Value = serde_json::from_str(&data).expect("Invalid JSON");
            let items = get_array(&json, &path);
            let mut groups: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
            for item in &items {
                let key = item.get(&field)
                    .map(|v| match v {
                        Value::String(s) => s.clone(),
                        _ => v.to_string(),
                    })
                    .unwrap_or_else(|| "(null)".to_string());
                *groups.entry(key).or_insert(0) += 1;
            }
            let mut sorted: Vec<_> = groups.into_iter().collect();
            sorted.sort_by(|a, b| b.1.cmp(&a.1));
            for (key, count) in &sorted {
                println!("{count:>4}  {key}");
            }
        }

        Command::Merge { files, output } => {
            let mut merged: Vec<Value> = Vec::new();
            for file in &files {
                let data = std::fs::read_to_string(file).expect(&format!("Failed to read {file}"));
                let value: Value = serde_json::from_str(&data).expect("Invalid JSON");
                match value {
                    Value::Array(arr) => merged.extend(arr),
                    _ => merged.push(value),
                }
            }
            let result = serde_json::to_string_pretty(&merged).unwrap();
            if let Some(ref out) = output {
                std::fs::write(out, &result).expect("Failed to write");
                eprintln!("Merged {} files → {} items → {}", files.len(), merged.len(), out);
            } else {
                println!("{result}");
            }
        }

        Command::Get { input, path } => {
            let data = read_input(&input);
            let json: Value = serde_json::from_str(&data).expect("Invalid JSON");
            let result = navigate_path(&json, &path);
            println!("{}", serde_json::to_string_pretty(&result).unwrap());
        }
    }
}

fn print_stats(value: &Value, prefix: &str, depth: usize) {
    let indent = "  ".repeat(depth);
    match value {
        Value::Object(map) => {
            println!("{indent}{prefix}Object ({} keys)", map.len());
            if depth < 3 {
                for (key, val) in map {
                    print_stats(val, &format!("{key}: "), depth + 1);
                }
            }
        }
        Value::Array(arr) => {
            println!("{indent}{prefix}Array ({} items)", arr.len());
            if !arr.is_empty() && depth < 3 {
                print_stats(&arr[0], "[0]: ", depth + 1);
            }
        }
        Value::String(s) => println!("{indent}{prefix}String ({})", s.len()),
        Value::Number(n) => println!("{indent}{prefix}Number ({n})"),
        Value::Bool(b) => println!("{indent}{prefix}Bool ({b})"),
        Value::Null => println!("{indent}{prefix}Null"),
    }
}
