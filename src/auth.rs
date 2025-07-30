use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use crate::security::create_secure_file;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub username: String,
    pub password_hash: String,
    pub vault_file: String,
}

impl User {
    pub fn new(username: String, password: &str) -> Result<Self, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("Failed to hash password: {}", e))?
            .to_string();
        
        let vault_file = format!("vault_{}.dat", username);
        
        Ok(User {
            username,
            password_hash,
            vault_file,
        })
    }
    
    pub fn verify_password(&self, password: &str) -> bool {
        let parsed_hash = match PasswordHash::new(&self.password_hash) {
            Ok(hash) => hash,
            Err(_) => return false,
        };
        
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok()
    }
}

pub struct UserManager {
    users_file: String,
}

impl UserManager {
    pub fn new() -> Self {
        UserManager {
            users_file: "users.json".to_string(),
        }
    }
    
    pub fn load_users(&self) -> Result<Vec<User>, String> {
        if !Path::new(&self.users_file).exists() {
            return Ok(Vec::new());
        }
        
        let mut file = File::open(&self.users_file)
            .map_err(|e| format!("Failed to open users file: {}", e))?;
        
        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .map_err(|e| format!("Failed to read users file: {}", e))?;
        
        if contents.trim().is_empty() {
            return Ok(Vec::new());
        }
        
        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse users file: {}", e))
    }
    
    pub fn save_users(&self, users: &[User]) -> Result<(), String> {
        let json = serde_json::to_string_pretty(users)
            .map_err(|e| format!("Failed to serialize users: {}", e))?;
        
        let mut file = create_secure_file(&self.users_file)
            .map_err(|e| format!("Failed to create secure users file: {}", e))?;
        
        file.write_all(json.as_bytes())
            .map_err(|e| format!("Failed to write users file: {}", e))?;
        
        Ok(())
    }
    
    pub fn register_user(&self, username: &str, password: &str) -> Result<User, String> {
        if username.trim().is_empty() {
            return Err("Username cannot be empty".to_string());
        }
        
        if password.len() < 8 {
            return Err("Password must be at least 8 characters long".to_string());
        }
        
        let mut users = self.load_users()?;
        
        if users.iter().any(|u| u.username == username) {
            return Err("Username already exists".to_string());
        }
        
        let user = User::new(username.to_string(), password)?;
        users.push(user.clone());
        self.save_users(&users)?;
        
        Ok(user)
    }
    
    pub fn authenticate_user(&self, username: &str, password: &str) -> Result<User, String> {
        let users = self.load_users()?;
        
        let user = users
            .iter()
            .find(|u| u.username == username)
            .ok_or_else(|| "Invalid username or password".to_string())?;
        
        if !user.verify_password(password) {
            return Err("Invalid username or password".to_string());
        }
        
        Ok(user.clone())
    }
    
    pub fn user_exists(&self, username: &str) -> bool {
        if let Ok(users) = self.load_users() {
            users.iter().any(|u| u.username == username)
        } else {
            false
        }
    }
}

pub fn validate_username(username: &str) -> Result<(), String> {
    if username.trim().is_empty() {
        return Err("Username cannot be empty".to_string());
    }
    
    if username.len() < 3 {
        return Err("Username must be at least 3 characters long".to_string());
    }
    
    if username.len() > 20 {
        return Err("Username must be no more than 20 characters long".to_string());
    }
    
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err("Username can only contain letters, numbers, underscores, and hyphens".to_string());
    }
    
    Ok(())
}

pub fn validate_login_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long".to_string());
    }
    
    let has_lowercase = password.chars().any(|c| c.is_ascii_lowercase());
    let has_uppercase = password.chars().any(|c| c.is_ascii_uppercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_special = password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));
    
    let mut missing = Vec::new();
    if !has_lowercase { missing.push("lowercase letter"); }
    if !has_uppercase { missing.push("uppercase letter"); }
    if !has_digit { missing.push("digit"); }
    if !has_special { missing.push("special character"); }
    
    if !missing.is_empty() {
        return Err(format!("Password must contain at least one: {}", missing.join(", ")));
    }
    
    Ok(())
}