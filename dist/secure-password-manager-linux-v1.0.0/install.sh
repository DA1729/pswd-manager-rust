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
