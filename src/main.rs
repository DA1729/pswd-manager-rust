mod crypto;
mod auth;
mod security;
mod gui;

use crypto::{decrypt_json, encrypt_json};
use auth::{User, UserManager, validate_username, validate_login_password};
use security::{
    SecurePasswordGenerator, SecureString, SecurityLogger, RateLimiter,
    create_secure_file, validate_input_string
};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{self, Read, Write};
use zeroize::Zeroize;

#[derive(Serialize, Deserialize)]
struct PasswordEntry {
    site: String,
    username: String,
    password: String,
}

impl std::fmt::Display for PasswordEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Site: {}, Username: {}, Password: [HIDDEN]", self.site, self.username)
    }
}

impl PasswordEntry {
    fn create_entry(site: String, username: String, password: String) -> Self {
        Self {
            site,
            username,
            password,
        }
    }
}

fn search_entries(entries: &[PasswordEntry]) -> Result<(), String> {
    println!("Enter website to search: ");
    let mut query = String::new();
    io::stdin()
        .read_line(&mut query)
        .map_err(|_| "Failed to read input")?;
    let query = query.trim();
    
    validate_input_string(query, 100, false)?;

    let mut found = false;

    for entry in entries {
        if entry.site.to_lowercase().contains(&query.to_lowercase()) {
            println!("Site: {} | Username: {} | Password: [HIDDEN - Use option 4 to reveal]", 
                entry.site, entry.username);
            found = true;
        }
    }

    if !found {
        println!("No entries found for site: {}", query);
    }
    Ok(())
}

fn validate_master_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Master password must be at least 8 characters long".to_string());
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
        return Err(format!("Master password must contain at least one: {}", missing.join(", ")));
    }
    
    Ok(())
}

fn get_master_password_with_confirmation() -> Result<String, String> {
    loop {
        println!("Enter master password: ");
        let password = rpassword::read_password().map_err(|_| "Failed to read password")?;
        
        if let Err(msg) = validate_master_password(&password) {
            println!("Password validation failed: {}", msg);
            continue;
        }
        
        println!("Confirm master password: ");
        let confirmation = rpassword::read_password().map_err(|_| "Failed to read password confirmation")?;
        
        if password != confirmation {
            println!("Passwords do not match. Please try again.");
            continue;
        }
        
        return Ok(password);
    }
}

fn get_master_password_with_retry(max_attempts: u32, filename: &str) -> Result<String, String> {
    for attempt in 1..=max_attempts {
        println!("Enter master password (attempt {} of {}): ", attempt, max_attempts);
        let password = rpassword::read_password().map_err(|_| "Failed to read password")?;
        
        if std::path::Path::new(filename).exists() {
            let mut file = File::open(filename).map_err(|_| "Failed to open vault file")?;
            let mut encrypted = String::new();
            file.read_to_string(&mut encrypted).map_err(|_| "Failed to read vault file")?;
            
            match decrypt_json(&encrypted, &password) {
                Ok(_) => return Ok(password),
                Err(_) => {
                    if attempt < max_attempts {
                        println!("Incorrect password. Please try again.");
                    } else {
                        return Err("Maximum password attempts exceeded".to_string());
                    }
                }
            }
        } else {
            return Ok(password);
        }
    }
    
    Err("Maximum password attempts exceeded".to_string())
}

fn generate_secure_password_interactive() -> Result<SecureString, String> {
    println!("Enter desired password length (8-128): ");
    let mut len_str = String::new();
    io::stdin().read_line(&mut len_str)
        .map_err(|_| "Failed to read length")?;
    
    let length = len_str.trim().parse::<usize>()
        .map_err(|_| "Invalid length")?;
    
    if length < 8 || length > 128 {
        return Err("Length must be between 8 and 128".to_string());
    }
    
    println!("Include symbols? (y/n): ");
    let mut symbols_choice = String::new();
    io::stdin().read_line(&mut symbols_choice)
        .map_err(|_| "Failed to read choice")?;
    
    let include_symbols = symbols_choice.trim().to_lowercase() == "y";
    
    let generator = SecurePasswordGenerator::new();
    let password = generator.generate_secure_password(length, include_symbols);
    let entropy = generator.calculate_entropy(password.as_str());
    
    println!("Generated password: {}", password.as_str());
    println!("Password entropy: {:.2} bits", entropy);
    
    Ok(password)
}


fn register_user(security_logger: &SecurityLogger) -> Result<User, String> {
    let user_manager = UserManager::new();
    
    println!("=== User Registration ===");
    
    loop {
        println!("Enter username: ");
        let mut username = String::new();
        io::stdin().read_line(&mut username)
            .map_err(|_| "Failed to read username")?;
        let username = username.trim();
        
        if let Err(msg) = validate_username(username) {
            println!("Username validation failed: {}", msg);
            security_logger.log_event("REGISTRATION_FAILED", Some(username), false, &format!("Invalid username: {}", msg));
            continue;
        }
        
        if user_manager.user_exists(username) {
            println!("Username already exists. Please choose a different username.");
            security_logger.log_event("REGISTRATION_FAILED", Some(username), false, "Username already exists");
            continue;
        }
        
        println!("Enter login password: ");
        let mut password = rpassword::read_password()
            .map_err(|_| "Failed to read password")?;
        
        if let Err(msg) = validate_login_password(&password) {
            println!("Password validation failed: {}", msg);
            password.zeroize();
            security_logger.log_event("REGISTRATION_FAILED", Some(username), false, "Invalid password format");
            continue;
        }
        
        println!("Confirm login password: ");
        let mut confirmation = rpassword::read_password()
            .map_err(|_| "Failed to read password confirmation")?;
        
        if password != confirmation {
            println!("Passwords do not match. Please try again.");
            password.zeroize();
            confirmation.zeroize();
            security_logger.log_event("REGISTRATION_FAILED", Some(username), false, "Password confirmation mismatch");
            continue;
        }
        
        match user_manager.register_user(username, &password) {
            Ok(user) => {
                println!("User registered successfully!");
                password.zeroize();
                confirmation.zeroize();
                security_logger.log_event("USER_REGISTERED", Some(username), true, "User registration successful");
                return Ok(user);
            },
            Err(err) => {
                println!("Registration failed: {}", err);
                password.zeroize();
                confirmation.zeroize();
                security_logger.log_event("REGISTRATION_FAILED", Some(username), false, &err);
                continue;
            }
        }
    }
}

fn login_user(rate_limiter: &mut RateLimiter, security_logger: &SecurityLogger) -> Result<User, String> {
    let user_manager = UserManager::new();
    
    println!("=== User Login ===");
    
    for attempt in 1..=3 {
        println!("Enter username (attempt {} of 3): ", attempt);
        let mut username = String::new();
        io::stdin().read_line(&mut username)
            .map_err(|_| "Failed to read username")?;
        let username = username.trim();
        
        if let Err(msg) = rate_limiter.check_and_record(username) {
            security_logger.log_event("LOGIN_BLOCKED", Some(username), false, &msg);
            return Err(msg);
        }
        
        println!("Enter login password: ");
        let mut password = rpassword::read_password()
            .map_err(|_| "Failed to read password")?;
        
        match user_manager.authenticate_user(username, &password) {
            Ok(user) => {
                println!("Login successful! Welcome, {}!", user.username);
                password.zeroize();
                rate_limiter.reset(username);
                security_logger.log_event("LOGIN_SUCCESS", Some(username), true, "User login successful");
                return Ok(user);
            },
            Err(_) => {
                password.zeroize();
                security_logger.log_event("LOGIN_FAILED", Some(username), false, &format!("Login attempt {} failed", attempt));
                if attempt < 3 {
                    println!("Invalid username or password. Please try again.");
                } else {
                    security_logger.log_event("LOGIN_LOCKED", Some(username), false, "Maximum login attempts exceeded");
                    return Err("Maximum login attempts exceeded".to_string());
                }
            }
        }
    }
    
    Err("Login failed".to_string())
}

fn main() -> Result<(), eframe::Error> {
    let args: Vec<String> = std::env::args().collect();
    
    if args.iter().any(|arg| arg == "--cli") {
        run_cli_mode();
        return Ok(());
    }
    
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([800.0, 600.0])
            .with_min_inner_size([600.0, 400.0]),
        ..Default::default()
    };
    
    eframe::run_native(
        "Secure Password Manager",
        options,
        Box::new(|_cc| Ok(Box::new(gui::PasswordManagerApp::default()))),
    )
}

fn run_cli_mode() {
    let security_logger = SecurityLogger::new();
    let mut rate_limiter = RateLimiter::new(3, 15); // 3 attempts per 15 minutes
    
    println!("=== Secure Password Manager ===");
    println!("1: Login");
    println!("2: Register new user");
    println!("3: Exit");
    
    let mut choice = String::new();
    if io::stdin().read_line(&mut choice).is_err() {
        println!("Failed to read input");
        return;
    }
    
    let current_user = match choice.trim() {
        "1" => {
            match login_user(&mut rate_limiter, &security_logger) {
                Ok(user) => user,
                Err(err) => {
                    println!("Login failed: {}", err);
                    return;
                }
            }
        },
        "2" => {
            match register_user(&security_logger) {
                Ok(user) => user,
                Err(err) => {
                    println!("Registration failed: {}", err);
                    return;
                }
            }
        },
        "3" => return,
        _ => {
            println!("Invalid choice");
            return;
        }
    };
    
    let filename = &current_user.vault_file;
    
    let mut master_password = if std::path::Path::new(filename).exists() {
        match get_master_password_with_retry(3, filename) {
            Ok(password) => password,
            Err(err) => {
                println!("Error: {}", err);
                security_logger.log_event("VAULT_ACCESS_DENIED", Some(&current_user.username), false, &err);
                return;
            }
        }
    } else {
        println!("No existing vault found for user {}. Creating new vault.", current_user.username);
        match get_master_password_with_confirmation() {
            Ok(password) => {
                println!("Master password set successfully!");
                security_logger.log_event("VAULT_CREATED", Some(&current_user.username), true, "New vault created");
                password
            },
            Err(err) => {
                println!("Error: {}", err);
                security_logger.log_event("VAULT_CREATION_FAILED", Some(&current_user.username), false, &err);
                return;
            }
        }
    };

    let mut entries = if std::path::Path::new(filename).exists() {
        match File::open(filename) {
            Ok(mut file) => {
                let mut encrypted = String::new();
                match file.read_to_string(&mut encrypted) {
                    Ok(_) => {
                        match decrypt_json(&encrypted, &master_password) {
                            Ok(decrypted_json) => {
                                serde_json::from_str(&decrypted_json).unwrap_or_else(|_| {
                                    security_logger.log_event("VAULT_PARSE_ERROR", Some(&current_user.username), false, "Failed to parse vault data");
                                    Vec::new()
                                })
                            },
                            Err(err) => {
                                println!("Failed to decrypt vault data: {}", err);
                                security_logger.log_event("VAULT_DECRYPT_ERROR", Some(&current_user.username), false, "Failed to decrypt vault");
                                master_password.zeroize();
                                return;
                            }
                        }
                    },
                    Err(err) => {
                        println!("Failed to read vault file: {}", err);
                        master_password.zeroize();
                        return;
                    }
                }
            },
            Err(err) => {
                println!("Failed to open vault file: {}", err);
                master_password.zeroize();
                return;
            }
        }
    } else {
        Vec::new()
    };

    println!("\n=== Password Vault for {} ===", current_user.username);
    println!("1: Add new entry");
    println!("2: View entries (passwords hidden)");
    println!("3: Search by website");
    println!("4: Reveal password for entry");
    println!("5: Generate secure password");
    println!("6: Change master password");
    println!("7: Exit");

    let mut choice = String::new();
    if io::stdin().read_line(&mut choice).is_err() {
        println!("Failed to read input");
        master_password.zeroize();
        return;
    }
    match choice.trim() {
        "1" => {
            println!("Enter the website: ");
            let mut website = String::new();
            if io::stdin().read_line(&mut website).is_err() {
                println!("Failed to read website");
            } else {
                let website = website.trim();
                if validate_input_string(website, 100, false).is_err() {
                    println!("Invalid website format");
                } else {
                    println!("Enter the username: ");
                    let mut username = String::new();
                    if io::stdin().read_line(&mut username).is_err() {
                        println!("Failed to read username");
                    } else {
                        let username = username.trim();
                        if validate_input_string(username, 100, false).is_err() {
                            println!("Invalid username format");
                        } else {
                            let mut password = String::new();
                            println!("Use secure password generation? (y/n): ");
                            let mut choice = String::new();
                            if io::stdin().read_line(&mut choice).is_ok() {
                                match choice.trim().to_lowercase().as_str() {
                                    "y" => {
                                        match generate_secure_password_interactive() {
                                            Ok(secure_pass) => {
                                                password = secure_pass.as_str().to_string();
                                            },
                                            Err(e) => {
                                                println!("Password generation failed: {}", e);
                                            }
                                        }
                                    },
                                    "n" => {
                                        println!("Enter the password: ");
                                        match rpassword::read_password() {
                                            Ok(pass) => password = pass,
                                            Err(_) => println!("Failed to read password")
                                        }
                                    },
                                    _ => println!("Invalid choice")
                                }
                            }
                            
                            if !password.is_empty() {
                                let entry = PasswordEntry::create_entry(
                                    website.to_string(),
                                    username.to_string(),
                                    password.clone(),
                                );
                                entries.push(entry);
                                password.zeroize();
                                println!("Entry added successfully!");
                                security_logger.log_event("ENTRY_ADDED", Some(&current_user.username), true, &format!("Added entry for {}", website));
                            }
                        }
                    }
                }
            }
        }

        "2" => {
            println!("\nSaved entries (passwords hidden):");
            if entries.is_empty() {
                println!("No entries found.");
            } else {
                for (i, entry) in entries.iter().enumerate() {
                    println!("{}: {}", i + 1, entry);
                }
            }
        }

        "3" => {
            if let Err(e) = search_entries(&entries) {
                println!("Search failed: {}", e);
            }
        }

        "4" => {
            if entries.is_empty() {
                println!("No entries available.");
            } else {
                println!("Enter entry number to reveal password (1-{}): ", entries.len());
                let mut choice = String::new();
                if io::stdin().read_line(&mut choice).is_ok() {
                    if let Ok(index) = choice.trim().parse::<usize>() {
                        if index > 0 && index <= entries.len() {
                            let entry = &entries[index - 1];
                            println!("Site: {}", entry.site);
                            println!("Username: {}", entry.username);
                            println!("Password: {}", entry.password);
                            security_logger.log_event("PASSWORD_REVEALED", Some(&current_user.username), true, &format!("Password revealed for {}", entry.site));
                        } else {
                            println!("Invalid entry number.");
                        }
                    } else {
                        println!("Invalid input.");
                    }
                }
            }
        }

        "5" => {
            match generate_secure_password_interactive() {
                Ok(_password) => {
                    println!("\nCopy this password and press Enter to continue...");
                    let mut input = String::new();
                    let _ = io::stdin().read_line(&mut input);
                },
                Err(e) => println!("Password generation failed: {}", e)
            }
        }

        "6" => {
            println!("Changing master password for user {}...", current_user.username);
            match get_master_password_with_confirmation() {
                Ok(mut new_password) => {
                    match serde_json::to_string_pretty(&entries) {
                        Ok(serialized) => {
                            match encrypt_json(&serialized, &new_password) {
                                Ok(encrypted) => {
                                    match create_secure_file(filename) {
                                        Ok(mut file) => {
                                            if file.write_all(encrypted.as_bytes()).is_ok() {
                                                println!("Master password changed successfully!");
                                                security_logger.log_event("MASTER_PASSWORD_CHANGED", Some(&current_user.username), true, "Master password updated");
                                                new_password.zeroize();
                                                master_password.zeroize();
                                                return;
                                            } else {
                                                println!("Failed to write vault file");
                                            }
                                        },
                                        Err(e) => println!("Failed to create vault file: {}", e)
                                    }
                                },
                                Err(e) => println!("Failed to encrypt vault: {}", e)
                            }
                        },
                        Err(e) => println!("Failed to serialize entries: {}", e)
                    }
                    new_password.zeroize();
                    security_logger.log_event("MASTER_PASSWORD_CHANGE_FAILED", Some(&current_user.username), false, "Master password change failed");
                },
                Err(err) => {
                    println!("Failed to change master password: {}", err);
                    security_logger.log_event("MASTER_PASSWORD_CHANGE_FAILED", Some(&current_user.username), false, &err);
                }
            }
        }

        "7" => {
            master_password.zeroize();
            security_logger.log_event("VAULT_CLOSED", Some(&current_user.username), true, "User logged out");
            return;
        }
        
        _ => println!("Invalid choice")
    }

    // Save vault
    match serde_json::to_string_pretty(&entries) {
        Ok(serialized) => {
            match encrypt_json(&serialized, &master_password) {
                Ok(encrypted) => {
                    match create_secure_file(filename) {
                        Ok(mut file) => {
                            if file.write_all(encrypted.as_bytes()).is_ok() {
                                security_logger.log_event("VAULT_SAVED", Some(&current_user.username), true, "Vault saved successfully");
                            } else {
                                println!("Warning: Failed to save vault");
                                security_logger.log_event("VAULT_SAVE_FAILED", Some(&current_user.username), false, "Failed to write vault file");
                            }
                        },
                        Err(e) => {
                            println!("Warning: Failed to create vault file: {}", e);
                            security_logger.log_event("VAULT_SAVE_FAILED", Some(&current_user.username), false, "Failed to create vault file");
                        }
                    }
                },
                Err(e) => {
                    println!("Warning: Failed to encrypt vault: {}", e);
                    security_logger.log_event("VAULT_SAVE_FAILED", Some(&current_user.username), false, "Failed to encrypt vault");
                }
            }
        },
        Err(e) => {
            println!("Warning: Failed to serialize entries: {}", e);
            security_logger.log_event("VAULT_SAVE_FAILED", Some(&current_user.username), false, "Failed to serialize entries");
        }
    }
    
    master_password.zeroize();
    security_logger.log_event("VAULT_CLOSED", Some(&current_user.username), true, "User session ended");
}
