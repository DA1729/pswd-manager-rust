use rand::Rng;
use zeroize::Zeroize;
use std::fs::OpenOptions;
use std::os::unix::fs::OpenOptionsExt;
use std::path::Path;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;

pub struct SecureString {
    data: String,
}

impl Drop for SecureString {
    fn drop(&mut self) {
        self.data.zeroize();
    }
}

impl SecureString {
    pub fn new(data: String) -> Self {
        Self { data }
    }
    
    pub fn as_str(&self) -> &str {
        &self.data
    }
    
    pub fn from_str(s: &str) -> Self {
        Self { data: s.to_string() }
    }
}

impl Clone for SecureString {
    fn clone(&self) -> Self {
        Self { data: self.data.clone() }
    }
}

pub struct SecurePasswordGenerator {
    lowercase: Vec<char>,
    uppercase: Vec<char>,
    digits: Vec<char>,
    symbols: Vec<char>,
}

impl SecurePasswordGenerator {
    pub fn new() -> Self {
        Self {
            lowercase: "abcdefghijklmnopqrstuvwxyz".chars().collect(),
            uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect(),
            digits: "0123456789".chars().collect(),
            symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?~".chars().collect(),
        }
    }
    
    pub fn generate_secure_password(&self, length: usize, include_symbols: bool) -> SecureString {
        if length < 8 {
            panic!("Password length must be at least 8 characters");
        }
        
        let mut rng = rand::thread_rng();
        let mut password = Vec::with_capacity(length);
        let mut charset = Vec::new();
        
        charset.extend(&self.lowercase);
        charset.extend(&self.uppercase);
        charset.extend(&self.digits);
        
        if include_symbols {
            charset.extend(&self.symbols);
        }
        
        password.push(self.lowercase[rng.gen_range(0..self.lowercase.len())]);
        password.push(self.uppercase[rng.gen_range(0..self.uppercase.len())]);
        password.push(self.digits[rng.gen_range(0..self.digits.len())]);
        
        if include_symbols {
            password.push(self.symbols[rng.gen_range(0..self.symbols.len())]);
        }
        
        for _ in password.len()..length {
            let idx = rng.gen_range(0..charset.len());
            password.push(charset[idx]);
        }
        
        for i in (1..password.len()).rev() {
            let j = rng.gen_range(0..=i);
            password.swap(i, j);
        }
        
        SecureString::new(password.into_iter().collect())
    }
    
    pub fn calculate_entropy(&self, password: &str) -> f64 {
        let mut charset_size = 0;
        
        if password.chars().any(|c| c.is_ascii_lowercase()) {
            charset_size += 26;
        }
        if password.chars().any(|c| c.is_ascii_uppercase()) {
            charset_size += 26;
        }
        if password.chars().any(|c| c.is_ascii_digit()) {
            charset_size += 10;
        }
        if password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?~".contains(c)) {
            charset_size += 28;
        }
        
        password.len() as f64 * (charset_size as f64).log2()
    }
}

pub fn create_secure_file<P: AsRef<Path>>(path: P) -> Result<File, std::io::Error> {
    OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .mode(0o600) // Owner read/write only
        .open(path)
}

pub fn set_secure_permissions<P: AsRef<Path>>(path: P) -> Result<(), std::io::Error> {
    use std::os::unix::fs::PermissionsExt;
    let metadata = std::fs::metadata(&path)?;
    let mut permissions = metadata.permissions();
    permissions.set_mode(0o600); // Owner read/write only
    std::fs::set_permissions(path, permissions)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: String,
    pub username: Option<String>,
    pub success: bool,
    pub details: String,
}

pub struct SecurityLogger {
    log_file: String,
}

impl SecurityLogger {
    pub fn new() -> Self {
        Self {
            log_file: "security.log".to_string(),
        }
    }
    
    pub fn log_event(&self, event_type: &str, username: Option<&str>, success: bool, details: &str) {
        let event = SecurityEvent {
            timestamp: Utc::now(),
            event_type: event_type.to_string(),
            username: username.map(|s| s.to_string()),
            success,
            details: details.to_string(),
        };
        
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .mode(0o600)
            .open(&self.log_file)
        {
            if let Ok(json) = serde_json::to_string(&event) {
                let _ = writeln!(file, "{}", json);
            }
        }
    }
}

pub fn validate_input_string(input: &str, max_length: usize, allow_special: bool) -> Result<(), String> {
    if input.is_empty() {
        return Err("Input cannot be empty".to_string());
    }
    
    if input.len() > max_length {
        return Err(format!("Input too long (max {} characters)", max_length));
    }
    
    if input.contains('\0') {
        return Err("Input contains null character".to_string());
    }
    
    if !allow_special {
        if input.chars().any(|c| c.is_control() && c != '\t' && c != '\n' && c != '\r') {
            return Err("Input contains invalid control characters".to_string());
        }
    }
    
    Ok(())
}

pub struct RateLimiter {
    attempts: std::collections::HashMap<String, (u32, DateTime<Utc>)>,
    max_attempts: u32,
    window_duration: chrono::Duration,
}

impl RateLimiter {
    pub fn new(max_attempts: u32, window_minutes: i64) -> Self {
        Self {
            attempts: std::collections::HashMap::new(),
            max_attempts,
            window_duration: chrono::Duration::minutes(window_minutes),
        }
    }
    
    pub fn check_and_record(&mut self, identifier: &str) -> Result<(), String> {
        let now = Utc::now();
        
        let (count, last_attempt) = self.attempts
            .get(identifier)
            .copied()
            .unwrap_or((0, now));
        
        if now - last_attempt > self.window_duration {
            self.attempts.insert(identifier.to_string(), (1, now));
            return Ok(());
        }
        
        if count >= self.max_attempts {
            return Err(format!(
                "Too many attempts. Try again in {} minutes.",
                (self.window_duration - (now - last_attempt)).num_minutes() + 1
            ));
        }
        
        self.attempts.insert(identifier.to_string(), (count + 1, now));
        Ok(())
    }
    
    pub fn reset(&mut self, identifier: &str) {
        self.attempts.remove(identifier);
    }
}