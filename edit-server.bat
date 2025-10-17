@echo off
echo Editing server files...

echo Opening SSH connection to edit players.js...
echo Use this command in SSH:
echo nano /root/hockeystars-app/server/src/routes/players.js
echo.
echo Find: router.get('/', auth, async (req, res) => {
echo Replace with: router.get('/', async (req, res) => {
echo.
echo Press any key to connect...
pause

ssh -i hockeystars root@157.230.26.197 