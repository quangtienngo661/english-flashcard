set -e
cd /work
[ -f package.json ] || npm init -y > /dev/null
npm i --no-audit --no-fund playwright@1.63.0 > npm.log 2>&1
npx playwright install --with-deps chromium > install.log 2>&1
echo SETUP-DONE
