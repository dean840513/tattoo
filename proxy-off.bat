@echo off
echo 🔧 Removing Git Proxy settings...

git config --global --unset http.proxy
git config --global --unset https.proxy

echo ✅ Git Proxy has been removed
pause
