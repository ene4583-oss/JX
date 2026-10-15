#!/bin/sh
set -eu
cd "$(dirname "$0")/backend"
if ! command -v node >/dev/null 2>&1; then
 echo '请先安装 Node.js LTS：https://nodejs.org/'
 exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"; then
 echo 'Node.js 版本太旧，请安装最新 LTS 版本。'
 exit 1
fi
if [ ! -f node_modules/.jianxu-installed ]; then
 npm ci --omit=dev
 touch node_modules/.jianxu-installed
fi
exec npm start
