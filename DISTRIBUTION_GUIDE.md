# Distribution Guide

## How to Share the Password Manager

### Method 1: Direct Binary (Simplest)
```bash
# Build and send just the binary
cargo build --release
# Send target/release/password_manager to your friend
```

Your friend runs: `./password_manager`

### Method 2: Complete Package (Recommended)
```bash
# Create distribution package
./distribute.sh
# Send dist/secure-password-manager-linux-v1.0.0.tar.gz
```

Your friend:
1. Extracts: `tar -xzf secure-password-manager-linux-v1.0.0.tar.gz`
2. Installs: `cd secure-password-manager-linux-v1.0.0 && ./install.sh`
3. Runs: `password_manager`

### Method 3: Local Network Server
```bash
# Start local web server
./serve.py
# Friends visit http://YOUR_IP:8000 to download
```

### Method 4: GitHub Releases (Best for multiple people)
1. Push to GitHub: `git push origin main`
2. Create release: `git tag v1.0.0 && git push origin v1.0.0`
3. Share GitHub release URL

## Security Considerations

⚠️ **Important**: This is personal-use software. Consider these points:

### For Distribution:
- Only share with trusted friends/family
- Verify binary integrity if possible
- Use secure channels (Signal, encrypted email)

### For Users:
- Create strong master passwords
- Enable full disk encryption
- Keep vault files backed up
- Don't use on shared computers

### Support:
- Users should read README.md thoroughly
- Monitor security.log for unusual activity
- Update regularly if you release new versions

## Cross-Platform Notes

Current build is Linux x86_64. For other platforms:

**macOS**: Users need to compile from source:
```bash
git clone <your-repo>
cd password_manager
cargo build --release
```

**Windows**: Same as macOS, or use WSL

**Android/iOS**: Not supported (terminal app)

## Troubleshooting

Common issues users might face:

1. **"Permission denied"**: `chmod +x password_manager`
2. **"Command not found"**: Install using `./install.sh` or add to PATH
3. **Rust not installed**: Use the binary distribution method
4. **Can't run binary**: Check architecture compatibility

## Version Management

When releasing updates:
1. Update version in `distribute.sh`
2. Document changes in README.md
3. Test thoroughly on clean system
4. Create new distribution package
5. Notify users of security updates