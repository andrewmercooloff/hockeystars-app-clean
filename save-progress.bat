@echo off
echo Saving progress to Git...
git add .
git commit -m "Auto-save: %date% %time%"
echo Progress saved!
pause 