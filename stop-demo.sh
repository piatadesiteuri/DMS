#!/bin/bash
echo "🛑 Stopping demo services..."
kill 34046 34061 2>/dev/null || true
pkill -f "node.*application.js" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true
echo "✅ Demo stopped"
