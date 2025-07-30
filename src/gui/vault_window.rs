use eframe::egui;
use std::fs::File;
use std::io::{Read, Write};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use crate::auth::User;
use crate::crypto::{decrypt_json, encrypt_json};
use crate::security::{SecurityLogger, validate_input_string, create_secure_file};
use super::password_generator::PasswordGeneratorDialog;

#[derive(Serialize, Deserialize, Clone)]
pub struct PasswordEntry {
    site: String,
    username: String,
    password: String,
}

impl PasswordEntry {
    fn new(site: String, username: String, password: String) -> Self {
        Self { site, username, password }
    }
}

enum DialogState {
    None,
    AddEntry,
    EditEntry(usize),
    ViewPassword(usize),
    ChangeMasterPassword,
}

pub struct VaultWindow {
    user: User,
    entries: Vec<PasswordEntry>,
    master_password: String,
    master_password_confirmed: bool,
    
    dialog_state: DialogState,
    
    // Form fields
    form_site: String,
    form_username: String,
    form_password: String,
    form_new_master_password: String,
    form_confirm_master_password: String,
    
    // UI state
    search_query: String,
    error_message: String,
    show_passwords: bool,
    
    password_generator: PasswordGeneratorDialog,
}

impl VaultWindow {
    pub fn new(user: User, _security_logger: &SecurityLogger) -> Self {
        let mut vault = Self {
            user,
            entries: Vec::new(),
            master_password: String::new(),
            master_password_confirmed: false,
            dialog_state: DialogState::None,
            form_site: String::new(),
            form_username: String::new(),
            form_password: String::new(),
            form_new_master_password: String::new(),
            form_confirm_master_password: String::new(),
            search_query: String::new(),
            error_message: String::new(),
            show_passwords: false,
            password_generator: PasswordGeneratorDialog::default(),
        };
        
        vault.prompt_master_password();
        vault
    }
    
    pub fn show(&mut self, ctx: &egui::Context, security_logger: &SecurityLogger) -> bool {
        let mut should_logout = false;
        
        if let Some(generated_password) = self.password_generator.show(ctx) {
            self.form_password = generated_password;
        }
        
        if !self.master_password_confirmed {
            self.show_master_password_dialog(ctx, security_logger);
        } else {
            egui::TopBottomPanel::top("menu_bar").show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.heading(format!("🔐 Password Vault - {}", self.user.username));
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if ui.button("Logout").clicked() {
                            should_logout = true;
                            security_logger.log_event("VAULT_CLOSED", Some(&self.user.username), true, "User logged out");
                        }
                    });
                });
            });
            
            egui::SidePanel::left("actions_panel").show(ctx, |ui| {
                ui.vertical(|ui| {
                    ui.heading("Actions");
                    ui.separator();
                    
                    if ui.button("➕ Add Entry").clicked() {
                        self.dialog_state = DialogState::AddEntry;
                        self.clear_form();
                    }
                    
                    if ui.button("🔑 Generate Password").clicked() {
                        self.password_generator.open = true;
                    }
                    
                    if ui.button("🔒 Change Master Password").clicked() {
                        self.dialog_state = DialogState::ChangeMasterPassword;
                        self.form_new_master_password.clear();
                        self.form_confirm_master_password.clear();
                    }
                    
                    ui.separator();
                    
                    ui.horizontal(|ui| {
                        ui.label("🔍");
                        ui.text_edit_singleline(&mut self.search_query);
                    });
                    
                    ui.checkbox(&mut self.show_passwords, "Show passwords");
                });
            });
            
            egui::CentralPanel::default().show(ctx, |ui| {
                self.show_entries_table(ui, security_logger);
            });
            
            self.show_dialogs(ctx, security_logger);
        }
        
        should_logout
    }
    
    fn show_master_password_dialog(&mut self, ctx: &egui::Context, security_logger: &SecurityLogger) {
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(100.0);
                ui.heading("Enter Master Password");
                ui.add_space(20.0);
                
                ui.group(|ui| {
                    ui.set_min_width(300.0);
                    ui.vertical(|ui| {
                        ui.add_space(10.0);
                        
                        ui.horizontal(|ui| {
                            ui.label("Master Password:");
                            ui.add(egui::TextEdit::singleline(&mut self.master_password).password(true));
                        });
                        
                        ui.add_space(10.0);
                        
                        if ui.button("Unlock Vault").clicked() {
                            if self.verify_master_password(security_logger) {
                                self.master_password_confirmed = true;
                                self.load_entries(security_logger);
                            }
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
    }
    
    fn show_entries_table(&mut self, ui: &mut egui::Ui, security_logger: &SecurityLogger) {
        let filtered_entries: Vec<(usize, PasswordEntry)> = self.entries
            .iter()
            .enumerate()
            .filter(|(_, entry)| {
                if self.search_query.is_empty() {
                    true
                } else {
                    entry.site.to_lowercase().contains(&self.search_query.to_lowercase()) ||
                    entry.username.to_lowercase().contains(&self.search_query.to_lowercase())
                }
            })
            .map(|(i, entry)| (i, entry.clone()))
            .collect();
        
        if filtered_entries.is_empty() {
            ui.vertical_centered(|ui| {
                ui.add_space(50.0);
                if self.entries.is_empty() {
                    ui.label("No password entries yet. Click 'Add Entry' to get started!");
                } else {
                    ui.label("No entries match your search.");
                }
            });
        } else {
            egui::ScrollArea::vertical().show(ui, |ui| {
                egui_extras::TableBuilder::new(ui)
                    .column(egui_extras::Column::auto())
                    .column(egui_extras::Column::auto())
                    .column(egui_extras::Column::auto())
                    .column(egui_extras::Column::remainder())
                    .header(30.0, |mut header| {
                        header.col(|ui| { ui.heading("Site"); });
                        header.col(|ui| { ui.heading("Username"); });
                        header.col(|ui| { ui.heading("Password"); });
                        header.col(|ui| { ui.heading("Actions"); });
                    })
                    .body(|mut body| {
                        for (original_index, entry) in &filtered_entries {
                            body.row(25.0, |mut row| {
                                row.col(|ui| { ui.label(&entry.site); });
                                row.col(|ui| { ui.label(&entry.username); });
                                row.col(|ui| {
                                    if self.show_passwords {
                                        ui.label(&entry.password);
                                    } else {
                                        ui.label("••••••••");
                                    }
                                });
                                row.col(|ui| {
                                    ui.horizontal(|ui| {
                                        if ui.small_button("👁").clicked() {
                                            self.dialog_state = DialogState::ViewPassword(*original_index);
                                            security_logger.log_event("PASSWORD_REVEALED", Some(&self.user.username), true, &format!("Password revealed for {}", entry.site));
                                        }
                                        if ui.small_button("✏").clicked() {
                                            self.dialog_state = DialogState::EditEntry(*original_index);
                                            self.form_site = entry.site.clone();
                                            self.form_username = entry.username.clone();
                                            self.form_password = entry.password.clone();
                                        }
                                        if ui.small_button("🗑").clicked() {
                                            self.entries.remove(*original_index);
                                            self.save_entries(security_logger);
                                            security_logger.log_event("ENTRY_DELETED", Some(&self.user.username), true, &format!("Deleted entry for {}", entry.site));
                                        }
                                        if ui.small_button("📋").clicked() {
                                            ui.output_mut(|o| o.copied_text = entry.password.clone());
                                        }
                                    });
                                });
                            });
                        }
                    });
            });
        }
    }
    
    fn show_dialogs(&mut self, ctx: &egui::Context, security_logger: &SecurityLogger) {
        match &self.dialog_state {
            DialogState::AddEntry => {
                self.show_add_edit_dialog(ctx, "Add New Entry", true, security_logger);
            }
            DialogState::EditEntry(_index) => {
                self.show_add_edit_dialog(ctx, "Edit Entry", false, security_logger);
            }
            DialogState::ViewPassword(index) => {
                if let Some(entry) = self.entries.get(*index).cloned() {
                    self.show_view_password_dialog(ctx, &entry);
                }
            }
            DialogState::ChangeMasterPassword => {
                self.show_change_master_password_dialog(ctx, security_logger);
            }
            DialogState::None => {}
        }
    }
    
    fn show_add_edit_dialog(&mut self, ctx: &egui::Context, title: &str, is_add: bool, security_logger: &SecurityLogger) {
        egui::Window::new(title)
            .collapsible(false)
            .resizable(false)
            .show(ctx, |ui| {
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.horizontal(|ui| {
                            ui.label("Site:");
                            ui.text_edit_singleline(&mut self.form_site);
                        });
                        
                        ui.horizontal(|ui| {
                            ui.label("Username:");
                            ui.text_edit_singleline(&mut self.form_username);
                        });
                        
                        ui.horizontal(|ui| {
                            ui.label("Password:");
                            ui.add(egui::TextEdit::singleline(&mut self.form_password).password(true));
                            if ui.button("Generate").clicked() {
                                self.password_generator.open = true;
                            }
                        });
                        
                        ui.add_space(10.0);
                        
                        ui.horizontal(|ui| {
                            if ui.button("Save").clicked() {
                                if self.validate_entry_form() {
                                    if is_add {
                                        let entry = PasswordEntry::new(
                                            self.form_site.clone(),
                                            self.form_username.clone(),
                                            self.form_password.clone(),
                                        );
                                        self.entries.push(entry);
                                        security_logger.log_event("ENTRY_ADDED", Some(&self.user.username), true, &format!("Added entry for {}", self.form_site));
                                    } else if let DialogState::EditEntry(index) = self.dialog_state {
                                        if let Some(entry) = self.entries.get_mut(index) {
                                            entry.site = self.form_site.clone();
                                            entry.username = self.form_username.clone();
                                            entry.password = self.form_password.clone();
                                            security_logger.log_event("ENTRY_UPDATED", Some(&self.user.username), true, &format!("Updated entry for {}", self.form_site));
                                        }
                                    }
                                    
                                    self.save_entries(security_logger);
                                    self.dialog_state = DialogState::None;
                                    self.clear_form();
                                }
                            }
                            
                            if ui.button("Cancel").clicked() {
                                self.dialog_state = DialogState::None;
                                self.clear_form();
                            }
                        });
                        
                        if !self.error_message.is_empty() {
                            ui.add_space(5.0);
                            ui.colored_label(egui::Color32::RED, &self.error_message);
                        }
                    });
                });
            });
    }
    
    fn show_view_password_dialog(&mut self, ctx: &egui::Context, entry: &PasswordEntry) {
        egui::Window::new("Password Details")
            .collapsible(false)
            .resizable(false)
            .show(ctx, |ui| {
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.horizontal(|ui| {
                            ui.label("Site:");
                            ui.label(&entry.site);
                        });
                        
                        ui.horizontal(|ui| {
                            ui.label("Username:");
                            ui.label(&entry.username);
                        });
                        
                        ui.horizontal(|ui| {
                            ui.label("Password:");
                            ui.text_edit_singleline(&mut entry.password.clone());
                            if ui.button("📋").clicked() {
                                ui.output_mut(|o| o.copied_text = entry.password.clone());
                            }
                        });
                        
                        ui.add_space(10.0);
                        
                        if ui.button("Close").clicked() {
                            self.dialog_state = DialogState::None;
                        }
                    });
                });
            });
    }
    
    fn show_change_master_password_dialog(&mut self, ctx: &egui::Context, security_logger: &SecurityLogger) {
        egui::Window::new("Change Master Password")
            .collapsible(false)
            .resizable(false)
            .show(ctx, |ui| {
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.horizontal(|ui| {
                            ui.label("New Password:");
                            ui.add(egui::TextEdit::singleline(&mut self.form_new_master_password).password(true));
                        });
                        
                        ui.horizontal(|ui| {
                            ui.label("Confirm:");
                            ui.add(egui::TextEdit::singleline(&mut self.form_confirm_master_password).password(true));
                        });
                        
                        ui.add_space(10.0);
                        
                        ui.horizontal(|ui| {
                            if ui.button("Change Password").clicked() {
                                if self.validate_master_password_change() {
                                    self.master_password = self.form_new_master_password.clone();
                                    self.save_entries(security_logger);
                                    security_logger.log_event("MASTER_PASSWORD_CHANGED", Some(&self.user.username), true, "Master password updated");
                                    self.dialog_state = DialogState::None;
                                    self.form_new_master_password.zeroize();
                                    self.form_confirm_master_password.zeroize();
                                }
                            }
                            
                            if ui.button("Cancel").clicked() {
                                self.dialog_state = DialogState::None;
                                self.form_new_master_password.zeroize();
                                self.form_confirm_master_password.zeroize();
                            }
                        });
                        
                        if !self.error_message.is_empty() {
                            ui.add_space(5.0);
                            ui.colored_label(egui::Color32::RED, &self.error_message);
                        }
                    });
                });
            });
    }
    
    fn prompt_master_password(&mut self) {
        // Always require master password confirmation, even for new vaults
        self.master_password_confirmed = false;
    }
    
    fn verify_master_password(&mut self, security_logger: &SecurityLogger) -> bool {
        // For new vaults, require a non-empty master password and validate its strength
        if !std::path::Path::new(&self.user.vault_file).exists() {
            if self.master_password.is_empty() {
                self.error_message = "Master password cannot be empty".to_string();
                security_logger.log_event("VAULT_ACCESS_DENIED", Some(&self.user.username), false, "Empty master password for new vault");
                return false;
            }
            
            // Validate master password strength for new vaults
            if let Err(msg) = self.validate_master_password_strength(&self.master_password) {
                self.error_message = msg;
                self.master_password.zeroize();
                security_logger.log_event("VAULT_ACCESS_DENIED", Some(&self.user.username), false, "Weak master password for new vault");
                return false;
            }
            
            self.error_message.clear();
            security_logger.log_event("NEW_VAULT_CREATED", Some(&self.user.username), true, "New vault created with master password");
            return true;
        }
        
        match File::open(&self.user.vault_file) {
            Ok(mut file) => {
                let mut encrypted = String::new();
                match file.read_to_string(&mut encrypted) {
                    Ok(_) => {
                        match decrypt_json(&encrypted, &self.master_password) {
                            Ok(_) => {
                                self.error_message.clear();
                                true
                            }
                            Err(_) => {
                                self.error_message = "Incorrect master password".to_string();
                                self.master_password.zeroize();
                                security_logger.log_event("VAULT_ACCESS_DENIED", Some(&self.user.username), false, "Incorrect master password");
                                false
                            }
                        }
                    }
                    Err(_) => {
                        self.error_message = "Failed to read vault file".to_string();
                        false
                    }
                }
            }
            Err(_) => {
                self.error_message = "Failed to open vault file".to_string();
                false
            }
        }
    }
    
    fn load_entries(&mut self, security_logger: &SecurityLogger) {
        if std::path::Path::new(&self.user.vault_file).exists() {
            if let Ok(mut file) = File::open(&self.user.vault_file) {
                let mut encrypted = String::new();
                if file.read_to_string(&mut encrypted).is_ok() {
                    if let Ok(decrypted) = decrypt_json(&encrypted, &self.master_password) {
                        if let Ok(entries) = serde_json::from_str(&decrypted) {
                            self.entries = entries;
                            security_logger.log_event("VAULT_LOADED", Some(&self.user.username), true, "Vault loaded successfully");
                        }
                    }
                }
            }
        }
    }
    
    fn save_entries(&self, security_logger: &SecurityLogger) {
        if let Ok(serialized) = serde_json::to_string_pretty(&self.entries) {
            if let Ok(encrypted) = encrypt_json(&serialized, &self.master_password) {
                if let Ok(mut file) = create_secure_file(&self.user.vault_file) {
                    if file.write_all(encrypted.as_bytes()).is_ok() {
                        security_logger.log_event("VAULT_SAVED", Some(&self.user.username), true, "Vault saved successfully");
                    } else {
                        security_logger.log_event("VAULT_SAVE_FAILED", Some(&self.user.username), false, "Failed to write vault file");
                    }
                } else {
                    security_logger.log_event("VAULT_SAVE_FAILED", Some(&self.user.username), false, "Failed to create vault file");
                }
            } else {
                security_logger.log_event("VAULT_SAVE_FAILED", Some(&self.user.username), false, "Failed to encrypt vault");
            }
        }
    }
    
    fn validate_entry_form(&mut self) -> bool {
        self.error_message.clear();
        
        if let Err(msg) = validate_input_string(&self.form_site, 100, false) {
            self.error_message = format!("Site: {}", msg);
            return false;
        }
        
        if let Err(msg) = validate_input_string(&self.form_username, 100, false) {
            self.error_message = format!("Username: {}", msg);
            return false;
        }
        
        if self.form_password.is_empty() {
            self.error_message = "Password cannot be empty".to_string();
            return false;
        }
        
        true
    }
    
    fn validate_master_password_change(&mut self) -> bool {
        self.error_message.clear();
        
        if let Err(msg) = self.validate_master_password_strength(&self.form_new_master_password) {
            self.error_message = msg;
            return false;
        }
        
        if self.form_new_master_password != self.form_confirm_master_password {
            self.error_message = "Passwords do not match".to_string();
            return false;
        }
        
        true
    }
    
    fn validate_master_password_strength(&self, password: &str) -> Result<(), String> {
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
    
    fn clear_form(&mut self) {
        self.form_site.clear();
        self.form_username.clear();
        self.form_password.zeroize();
        self.error_message.clear();
    }
}