#!/usr/bin/env bash
# 使い方: ~/romaji-typing/deploy.sh "コミットメッセージ"
# 変更をコミットして GitHub Pages へ反映します。
# shared/ 配下を変えたときは、各HTMLの ?v= とキャッシュ版数(build.txt / BUILD定数)を
# 同じ新版に自動でそろえ、家族のタブレットにも更新が確実に届くようにします。
set -e
cd "$(dirname "$0")"

MSG="${1:-タイピングを更新}"

if [ -z "$(git status --porcelain)" ]; then
  echo "変更はありません。"
  exit 0
fi

CHANGES="$(git status --porcelain)"
if printf '%s\n' "$CHANGES" | grep -q 'shared/'; then
  STAMP=$(date +%Y%m%d%H%M)
  # build.txt を新版に
  printf '%s\n' "$STAMP" > shared/build.txt
  # 各HTMLの ?v=... と BUILD='...' を新版にそろえる
  find . -name '*.html' -not -path './.git/*' -print0 \
    | xargs -0 sed -i '' -E "s|(\?v=)[0-9]{8,}|\1${STAMP}|g; s|(BUILD=')[0-9]{8,}(')|\1${STAMP}\2|g"
  echo "🔄 共有アセットの更新を検出 → キャッシュ版数を ${STAMP} にそろえました"
fi

git add -A
git commit -m "$MSG"
git push
echo ""
echo "✅ 反映しました。1〜2分後に下記URLへ反映されます："
echo "   https://mikushiba.github.io/romaji-typing/"
