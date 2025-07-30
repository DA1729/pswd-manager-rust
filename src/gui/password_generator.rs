use eframe::egui;
use crate::security::{SecurePasswordGenerator, SecureString};

pub struct PasswordGeneratorDialog {
    pub open: bool,
    length: usize,
    include_symbols: bool,
    generated_password: Option<SecureString>,
    generator: SecurePasswordGenerator,
    entropy: f64,
}

impl Default for PasswordGeneratorDialog {
    fn default() -> Self {
        Self {
            open: false,
            length: 16,
            include_symbols: true,
            generated_password: None,
            generator: SecurePasswordGenerator::new(),
            entropy: 0.0,
        }
    }
}

impl PasswordGeneratorDialog {
    pub fn show(&mut self, ctx: &egui::Context) -> Option<String> {
        let mut password_selected = None;
        
        if self.open {
            egui::Window::new("Password Generator")
                .collapsible(false)
                .resizable(false)
                .show(ctx, |ui| {
                    ui.group(|ui| {
                        ui.vertical(|ui| {
                            ui.horizontal(|ui| {
                                ui.label("Length:");
                                ui.add(egui::Slider::new(&mut self.length, 8..=128));
                            });
                            
                            ui.checkbox(&mut self.include_symbols, "Include symbols");
                            
                            ui.add_space(10.0);
                            
                            if ui.button("Generate Password").clicked() {
                                let password = self.generator.generate_secure_password(self.length, self.include_symbols);
                                self.entropy = self.generator.calculate_entropy(password.as_str());
                                self.generated_password = Some(password);
                            }
                            
                            if let Some(password) = self.generated_password.clone() {
                                ui.add_space(10.0);
                                ui.label("Generated Password:");
                                
                                ui.horizontal(|ui| {
                                    ui.text_edit_singleline(&mut password.as_str().to_string());
                                    if ui.button("📋").clicked() {
                                        ui.output_mut(|o| o.copied_text = password.as_str().to_string());
                                    }
                                });
                                
                                ui.label(format!("Entropy: {:.2} bits", self.entropy));
                                
                                ui.add_space(10.0);
                                
                                ui.horizontal(|ui| {
                                    if ui.button("Use This Password").clicked() {
                                        password_selected = Some(password.as_str().to_string());
                                        self.open = false;
                                        self.generated_password = None;
                                    }
                                    
                                    if ui.button("Cancel").clicked() {
                                        self.open = false;
                                        self.generated_password = None;
                                    }
                                });
                            } else {
                                ui.add_space(10.0);
                                if ui.button("Cancel").clicked() {
                                    self.open = false;
                                }
                            }
                        });
                    });
                });
        }
        
        password_selected
    }
}