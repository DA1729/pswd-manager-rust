# Secure Password Manager

A production-ready, secure password manager written in Rust for personal use.

## Security Features

- **AES-256-GCM Encryption**: Industry-standard encryption for vault data
- **Argon2id Key Derivation**: Memory-hard password hashing with strong parameters
- **Secure Memory Management**: Sensitive data is zeroed after use
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation and sanitization
- **Secure File Permissions**: Files created with restrictive permissions (600)
- **Audit Logging**: Security events logged for monitoring
- **Strong Password Generation**: Cryptographically secure password generation

## Usage

### Build and Run
```bash
cargo build --release
./target/release/password_manager
```

### Security Recommendations

1. **Master Password**: Use a strong, unique master password with:
   - At least 8 characters (longer is better)
   - Uppercase and lowercase letters
   - Numbers and special characters

2. **File Protection**: 
   - Keep vault files (`*.dat`) secure
   - Regular backups to encrypted storage
   - Never commit vault files to version control

3. **System Security**:
   - Use on a secure, updated system
   - Enable full disk encryption
   - Use a hardware security key when possible

4. **Operational Security**:
   - Clear clipboard after copying passwords
   - Lock screen when away
   - Review security logs regularly

### Files Created

- `users.json`: User accounts (hashed passwords only)
- `vault_<username>.dat`: Encrypted password vault
- `security.log`: Security audit trail

### Security Events Logged

- User registration/login attempts
- Vault access/modifications
- Password revelations
- Failed authentication attempts
- Rate limiting triggers

## Important Notes

⚠️ **This is for personal use only** - not suitable for multi-user production environments without additional hardening.

⚠️ **Backup Strategy Required** - Implement regular encrypted backups of your vault files.

⚠️ **Physical Security** - Secure your device and storage media appropriately.

## Development

Built with security best practices:
- No debug output of sensitive data
- Comprehensive error handling
- Memory-safe operations
- Secure random number generation
