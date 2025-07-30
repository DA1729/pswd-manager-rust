use eframe::egui;
use crate::auth::{User, UserManager, validate_username, validate_login_password};
use crate::security::{SecurityLogger, RateLimiter};
use zeroize::Zeroize;

#[derive(PartialEq)]
enum AuthMode {
    Login,
    Register,
}

pub struct AuthWindow {
    mode: AuthMode,
    username: String,
    password: String,
    confirm_password: String,
    error_message: String,
    user_manager: UserManager,
    show_reset_confirmation: bool,
    reset_confirmation_text: String,
}

impl Default for AuthWindow {
    fn default() -> Self {
        Self {
            mode: AuthMode::Login,
            username: String::new(),
            password: String::new(),
            confirm_password: String::new(),
            error_message: String::new(),
            user_manager: UserManager::new(),
            show_reset_confirmation: false,
            reset_confirmation_text: String::new(),
        }
    }
}

impl AuthWindow {
    pub fn show(&mut self, ctx: &egui::Context, rate_limiter: &mut RateLimiter, security_logger: &SecurityLogger) -> Option<User> {
        let mut user_result = None;
        
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(50.0);
                ui.heading("🔐 Secure Password Manager");
                ui.add_space(30.0);
                
                ui.horizontal(|ui| {
                    ui.selectable_value(&mut self.mode, AuthMode::Login, "Login");
                    ui.selectable_value(&mut self.mode, AuthMode::Register, "Register");
                });
                
                ui.add_space(20.0);
                
                ui.group(|ui| {
                    ui.set_min_width(300.0);
                    ui.vertical(|ui| {
                        ui.add_space(10.0);
                        
                        ui.horizontal(|ui| {
                            ui.label("Username:");
                            ui.text_edit_singleline(&mut self.username);
                        });
                        
                        ui.horizontal(|ui| {
                            ui.label("Password:");
                            ui.add(egui::TextEdit::singleline(&mut self.password).password(true));
                        });
                        
                        if self.mode == AuthMode::Register {
                            ui.horizontal(|ui| {
                                ui.label("Confirm:");
                                ui.add(egui::TextEdit::singleline(&mut self.confirm_password).password(true));
                            });
                        }
                        
                        ui.add_space(10.0);
                        
                        let button_text = match self.mode {
                            AuthMode::Login => "Login",
                            AuthMode::Register => "Register",
                        };
                        
                        if ui.button(button_text).clicked() {
                            user_result = self.handle_auth_action(rate_limiter, security_logger);
                        }
                        
                        ui.add_space(10.0);
                    });
                });
                
                if !self.error_message.is_empty() {
                    ui.add_space(10.0);
                    ui.colored_label(egui::Color32::RED, &self.error_message);
                }
                
                ui.add_space(20.0);
                ui.separator();
                ui.add_space(10.0);
                
                if ui.button("🔄 Reset Application").clicked() {
                    self.show_reset_confirmation = true;
                    self.reset_confirmation_text.clear();
                }
            });
        });
        
        // Reset confirmation dialog
        if self.show_reset_confirmation {
            egui::Window::new("⚠️ Reset Application")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(ctx, |ui| {
                    ui.vertical(|ui| {
                        ui.label("⚠️ WARNING: This will permanently delete ALL data!");
                        ui.add_space(10.0);
                        
                        ui.label("This includes:");
                        ui.label("• All user accounts");
                        ui.label("• All password vaults");
                        ui.label("• Security logs");
                        ui.add_space(10.0);
                        
                        ui.label("Type 'RESET' to confirm:");
                        ui.text_edit_singleline(&mut self.reset_confirmation_text);
                        ui.add_space(10.0);
                        
                        ui.horizontal(|ui| {
                            if ui.button("Cancel").clicked() {
                                self.show_reset_confirmation = false;
                                self.reset_confirmation_text.clear();
                            }
                            
                            let reset_enabled = self.reset_confirmation_text == "RESET";
                            if ui.add_enabled(reset_enabled, egui::Button::new("🔄 Reset")).clicked() {
                                self.perform_reset(security_logger);
                                self.show_reset_confirmation = false;
                                self.reset_confirmation_text.clear();
                            }
                        });
                    });
                });
        }
        
        user_result
    }
    
    fn handle_auth_action(&mut self, rate_limiter: &mut RateLimiter, security_logger: &SecurityLogger) -> Option<User> {
        self.error_message.clear();
        
        match self.mode {
            AuthMode::Login => self.handle_login(rate_limiter, security_logger),
            AuthMode::Register => self.handle_register(security_logger),
        }
    }
    
    fn handle_login(&mut self, rate_limiter: &mut RateLimiter, security_logger: &SecurityLogger) -> Option<User> {
        if let Err(msg) = rate_limiter.check_and_record(&self.username) {
            self.error_message = msg;
            security_logger.log_event("LOGIN_BLOCKED", Some(&self.username), false, &self.error_message);
            return None;
        }
        
        match self.user_manager.authenticate_user(&self.username, &self.password) {
            Ok(user) => {
                rate_limiter.reset(&self.username);
                security_logger.log_event("LOGIN_SUCCESS", Some(&self.username), true, "User login successful");
                
                self.password.zeroize();
                self.username.clear();
                
                Some(user)
            }
            Err(err) => {
                self.error_message = "Invalid username or password".to_string();
                self.password.zeroize();
                security_logger.log_event("LOGIN_FAILED", Some(&self.username), false, &err);
                None
            }
        }
    }
    
    fn handle_register(&mut self, security_logger: &SecurityLogger) -> Option<User> {
        if let Err(msg) = validate_username(&self.username) {
            self.error_message = msg;
            security_logger.log_event("REGISTRATION_FAILED", Some(&self.username), false, &self.error_message);
            return None;
        }
        
        if self.user_manager.user_exists(&self.username) {
            self.error_message = "Username already exists".to_string();
            security_logger.log_event("REGISTRATION_FAILED", Some(&self.username), false, "Username already exists");
            return None;
        }
        
        if let Err(msg) = validate_login_password(&self.password) {
            self.error_message = msg;
            self.password.zeroize();
            self.confirm_password.zeroize();
            security_logger.log_event("REGISTRATION_FAILED", Some(&self.username), false, "Invalid password format");
            return None;
        }
        
        if self.password != self.confirm_password {
            self.error_message = "Passwords do not match".to_string();
            self.password.zeroize();
            self.confirm_password.zeroize();
            security_logger.log_event("REGISTRATION_FAILED", Some(&self.username), false, "Password confirmation mismatch");
            return None;
        }
        
        match self.user_manager.register_user(&self.username, &self.password) {
            Ok(user) => {
                security_logger.log_event("USER_REGISTERED", Some(&self.username), true, "User registration successful");
                
                self.password.zeroize();
                self.confirm_password.zeroize();
                self.username.clear();
                
                Some(user)
            }
            Err(err) => {
                self.error_message = err.clone();
                self.password.zeroize();
                self.confirm_password.zeroize();
                security_logger.log_event("REGISTRATION_FAILED", Some(&self.username), false, &err);
                None
            }
        }
    }
    
    fn perform_reset(&mut self, security_logger: &SecurityLogger) {
        security_logger.log_event("RESET_INITIATED", None, true, "Application reset initiated from GUI");
        
        let mut files_removed = 0;
        
        // Remove users.json
        if std::path::Path::new("users.json").exists() {
            let _ = std::fs::remove_file("users.json");
            files_removed += 1;
        }
        
        // Remove all vault files (*.dat)
        if let Ok(entries) = std::fs::read_dir(".") {
            for entry in entries.flatten() {
                if let Some(filename) = entry.file_name().to_str() {
                    if filename.ends_with(".dat") {
                        let _ = std::fs::remove_file(&entry.path());
                        files_removed += 1;
                    }
                }
            }
        }
        
        // Remove security.log
        if std::path::Path::new("security.log").exists() {
            let _ = std::fs::remove_file("security.log");
            files_removed += 1;
        }
        
        // Reset the auth window state
        self.username.clear();
        self.password.zeroize();
        self.confirm_password.zeroize();
        self.error_message = format!("✅ Reset complete! Application returned to initial state.");
        self.user_manager = UserManager::new();
        
        // Log the completion (this will create a new log file)
        let final_logger = SecurityLogger::new();
        final_logger.log_event("RESET_COMPLETED", None, true, &format!("Application reset completed from GUI, {} files removed", files_removed));
    }
}