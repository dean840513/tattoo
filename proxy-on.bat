@echo off
echo 🌐 Setting Git Proxy to v2rayN...

git config --global http.proxy http://127.0.0.1:10809
git config --global https.proxy http://127.0.0.1:10809

echo ✅ Git Proxy has been set to http://127.0.0.1:10809
pause
