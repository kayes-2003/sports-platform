@echo off
echo ============================================
echo  Fix: Remove node_modules from Git tracking
echo ============================================
echo.

REM Step 1: Remove everything from git index (not from disk)
git rm -r --cached . --quiet
echo [1/4] Cleared git cache

REM Step 2: Re-add everything (gitignore will now exclude node_modules)
git add .
echo [2/4] Re-staged all files (node_modules excluded)

REM Step 3: Commit the fix
git commit -m "fix: remove node_modules and build artifacts from tracking"
echo [3/4] Committed

REM Step 4: Push
git push -u origin main
echo [4/4] Pushed to GitHub!

echo.
echo Done! Your repository should now push without the large file error.
pause
