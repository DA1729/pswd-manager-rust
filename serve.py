#!/usr/bin/env python3
"""
Simple HTTP server to distribute the password manager
Run this on your local network to let friends download
"""

import http.server
import socketserver
import os
import subprocess

PORT = 8000

# Build the latest version
print("Building latest version...")
subprocess.run(["cargo", "build", "--release"], check=True)
subprocess.run(["./distribute.sh"], check=True)

# Serve the dist directory
os.chdir("dist")

Handler = http.server.SimpleHTTPRequestHandler

print(f"\n🚀 Serving password manager at:")
print(f"   http://localhost:{PORT}")
print(f"   http://YOUR_IP_ADDRESS:{PORT}")
print(f"\nTell friends to download: secure-password-manager-linux-v1.0.0.tar.gz")
print(f"Press Ctrl+C to stop\n")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()