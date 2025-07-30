#!/bin/bash

# Distribution script for Secure Password Manager
# Creates platform-specific packages for easy sharing

set -e

VERSION="1.0.0"
APP_NAME="secure-password-manager"

echo "Building Secure Password Manager v$VERSION..."

# Clean and build release
cargo clean
cargo build --release

# Create distribution directory
mkdir -p dist

# Create Linux package
echo "Creating Linux distribution..."
mkdir -p "dist/${APP_NAME}-linux-v${VERSION}"
cp target/release/password_manager "dist/${APP_NAME}-linux-v${VERSION}/"
cp README.md "dist/${APP_NAME}-linux-v${VERSION}/"

# Create installation script
cat > "dist/${APP_NAME}-linux-v${VERSION}/install.sh" << 'EOF'
#!/bin/bash
echo "Installing Secure Password Manager..."
mkdir -p ~/.local/bin
cp password_manager ~/.local/bin/
chmod +x ~/.local/bin/password_manager

# Add to PATH if not already there
if ! echo $PATH | grep -q "$HOME/.local/bin"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo "Added ~/.local/bin to PATH in ~/.bashrc"
    echo "Run 'source ~/.bashrc' or restart your terminal"
fi

echo "Installation complete! Run 'password_manager' to start."
EOF

chmod +x "dist/${APP_NAME}-linux-v${VERSION}/install.sh"

# Create usage instructions
cat > "dist/${APP_NAME}-linux-v${VERSION}/USAGE.txt" << 'EOF'
SECURE PASSWORD MANAGER - QUICK START

1. Run: ./password_manager
2. Choose option 2 to register a new user
3. Create a strong master password
4. Start adding your passwords!

SECURITY TIPS:
- Use a unique, strong master password
- Keep your vault files (.dat) backed up safely
- Never share your master password
- The app creates files with secure permissions automatically

FILES CREATED:
- users.json: Your user account (password is hashed)
- vault_<username>.dat: Your encrypted password vault
- security.log: Security audit log

For detailed information, see README.md
EOF

# Create archive
cd dist
tar -czf "${APP_NAME}-linux-v${VERSION}.tar.gz" "${APP_NAME}-linux-v${VERSION}/"
cd ..

echo "✅ Linux distribution created: dist/${APP_NAME}-linux-v${VERSION}.tar.gz"
echo "📦 Size: $(du -h "dist/${APP_NAME}-linux-v${VERSION}.tar.gz" | cut -f1)"
echo ""
echo "To distribute:"
echo "1. Send the .tar.gz file to users"
echo "2. They extract it: tar -xzf ${APP_NAME}-linux-v${VERSION}.tar.gz"
echo "3. They run: cd ${APP_NAME}-linux-v${VERSION} && ./install.sh"
echo "4. Or they can run directly: ./password_manager"