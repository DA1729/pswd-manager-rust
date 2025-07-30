use eframe::egui;
use crate::security::{SecurityLogger, RateLimiter};
use super::auth_window::AuthWindow;
use super::vault_window::VaultWindow;

#[derive(PartialEq)]
enum AppState {
    Authentication,
    Vault,
}

pub struct PasswordManagerApp {
    state: AppState,
    auth_window: AuthWindow,
    vault_window: Option<VaultWindow>,
    security_logger: SecurityLogger,
    rate_limiter: RateLimiter,
}

impl Default for PasswordManagerApp {
    fn default() -> Self {
        Self {
            state: AppState::Authentication,
            auth_window: AuthWindow::default(),
            vault_window: None,
            security_logger: SecurityLogger::new(),
            rate_limiter: RateLimiter::new(3, 15),
        }
    }
}

impl eframe::App for PasswordManagerApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        match self.state {
            AppState::Authentication => {
                if let Some(user) = self.auth_window.show(ctx, &mut self.rate_limiter, &self.security_logger) {
                    self.vault_window = Some(VaultWindow::new(user, &self.security_logger));
                    self.state = AppState::Vault;
                }
            }
            AppState::Vault => {
                if let Some(vault_window) = &mut self.vault_window {
                    let should_logout = vault_window.show(ctx, &self.security_logger);
                    if should_logout {
                        self.vault_window = None;
                        self.auth_window = AuthWindow::default();
                        self.state = AppState::Authentication;
                    }
                }
            }
        }
    }
}