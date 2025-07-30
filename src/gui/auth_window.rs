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
            });
        });
        
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
}