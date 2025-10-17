@echo off
echo Updating server...

echo Step 1: Connecting to server and updating code...
ssh -i hockeystars root@157.230.26.197 "cd hockeystars-app && git pull origin main"

echo Step 2: Restarting PM2...
ssh -i hockeystars root@157.230.26.197 "pm2 restart hockeystars"

echo Step 3: Checking status...
ssh -i hockeystars root@157.230.26.197 "pm2 status"

echo Step 4: Showing logs...
ssh -i hockeystars root@157.230.26.197 "pm2 logs hockeystars --lines 5"

echo Server updated successfully!
pause 