# Password Manager Mobile App

A secure mobile password manager built with React Native and Expo, designed to complement the Rust desktop password manager.

## Features

### 🔐 Security
- **AES-256-GCM Encryption**: Military-grade encryption for password storage
- **PBKDF2 Key Derivation**: 600,000 iterations for strong password-based encryption
- **Zero-Knowledge Architecture**: Only you can decrypt your passwords
- **Biometric Authentication**: Fingerprint and Face ID support
- **Secure Memory Management**: Sensitive data cleared from memory
- **Rate Limiting**: Protection against brute force attacks

### 📱 Mobile Features
- **Cross-Platform**: Works on iOS and Android
- **Offline-First**: All data stored locally and encrypted
- **Secure Storage**: Uses platform keychain/keystore
- **Material Design**: Modern, intuitive interface
- **Search & Filter**: Quickly find your passwords
- **Copy to Clipboard**: Easy password copying with security alerts

### 🛠 Password Management
- **Password Generator**: Cryptographically secure password generation
- **Entropy Calculation**: Real-time password strength analysis
- **Customizable Generation**: Configure length and character sets
- **Password Analysis**: Crack time estimation and security scoring
- **Secure Sharing**: Copy passwords safely to clipboard

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Quick Start

1. **Install Expo CLI globally**:
   ```bash
   npm install -g @expo/cli
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Run on device/simulator**:
   - For Android: `npm run android`
   - For iOS: `npm run ios`
   - For web: `npm run web`

### Building for Production

#### Android APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

#### iOS App
```bash
# Build for iOS (requires macOS)
eas build --platform ios --profile production
```

## App Architecture

### Core Components
- **AuthContext**: User authentication and session management
- **VaultContext**: Password vault operations and state management
- **CryptoUtils**: Encryption, decryption, and password generation
- **SecureStorage**: Platform-specific secure storage abstraction

### Security Implementation
- **Encryption**: AES-256-GCM with 96-bit IV and 128-bit authentication tag
- **Key Derivation**: PBKDF2 with SHA-256, 600,000 iterations, 32-byte salt
- **Storage**: Expo SecureStore (iOS Keychain/Android Keystore)
- **Memory Safety**: Automatic cleanup of sensitive data

### Navigation Flow
```
Login/Register → Unlock Vault → Password List → Add/Edit/Generate
```

## Security Best Practices

### For Users
1. **Strong Master Password**: Use a unique, complex master password
2. **Biometric Lock**: Enable fingerprint/face recognition when available
3. **Regular Backups**: Export and backup your encrypted vault
4. **Device Security**: Keep your device locked and updated
5. **Network Security**: Use on trusted networks only

### For Developers
1. **No Debug Logging**: Never log sensitive data
2. **Memory Management**: Clear sensitive strings after use
3. **Secure Defaults**: Maximum security settings by default
4. **Input Validation**: Validate all user inputs
5. **Error Handling**: Generic error messages to prevent information leakage

## Configuration

### App Configuration (`app.json`)
- Bundle identifiers and permissions
- Biometric authentication permissions
- Platform-specific settings

### Build Configuration (`eas.json`)
- Development, preview, and production builds
- Platform-specific build settings
- Resource allocation for builds

## API Reference

### CryptoUtils
```typescript
// Generate secure password
CryptoUtils.generateSecurePassword(length, includeSymbols, includeNumbers, includeUppercase, includeLowercase)

// Encrypt data
CryptoUtils.encryptData(data, password)

// Decrypt data
CryptoUtils.decryptData(encryptedData, password)

// Validate password strength
CryptoUtils.validatePasswordStrength(password)
```

### SecureStorage
```typescript
// Store encrypted vault
SecureStorage.storeEncryptedVault(username, entries, masterPassword)

// Retrieve encrypted vault
SecureStorage.getEncryptedVault(username, masterPassword)

// Check if vault exists
SecureStorage.vaultExists(username)
```

## Compatibility

- **iOS**: 11.0+
- **Android**: API level 21+ (Android 5.0+)
- **Expo SDK**: 49+
- **React Native**: 0.72+

## Security Considerations

### Data Flow
1. User enters master password
2. Password is used to derive encryption key via PBKDF2
3. Vault data is encrypted/decrypted in memory only
4. Encrypted data is stored in platform keychain/keystore
5. Sensitive data is cleared from memory after use

### Threat Model
- **Local Device Access**: Protected by device lock + biometrics
- **Data Extraction**: All data encrypted, keys not stored
- **Network Attacks**: No network communication (offline-first)
- **Memory Dumps**: Sensitive data cleared after use
- **Brute Force**: Rate limiting + strong key derivation

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Clear Metro cache: `npx expo start --clear`
   - Reset modules: `rm -rf node_modules && npm install`

2. **Biometric Issues**:
   - Check device permissions
   - Verify biometric enrollment
   - Test on physical device (not simulator)

3. **Storage Issues**:
   - Clear app data to reset
   - Check device storage space
   - Verify SecureStore availability

### Debug Mode
```bash
# Enable debug logging (development only)
npx expo start --dev-client
```

## Contributing

1. Follow security-first development practices
2. Test on both iOS and Android devices
3. Validate all cryptographic implementations
4. Ensure no sensitive data in logs or error messages
5. Follow TypeScript strict mode guidelines

## License

This project is designed for personal use only. Not suitable for multi-user production environments without additional security hardening.

## Security Disclosure

If you discover security vulnerabilities, please report them responsibly by creating a private issue or contacting the maintainers directly.

---

⚠️ **Important Security Notes**:
- This app stores all data locally on your device
- No data is transmitted over the internet
- Master password cannot be recovered if forgotten
- Regular encrypted backups are recommended
- Keep your device and app updated