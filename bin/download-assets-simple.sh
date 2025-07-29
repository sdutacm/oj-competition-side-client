#!/bin/bash

set -e

echo "Starting download of release assets for tag: $GITHUB_REF_NAME"

# 验证环境变量
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set"
  exit 1
fi

# 创建下载目录
mkdir -p ./downloads
cd ./downloads

# 直接通过 GitHub API 获取 Release 信息
echo "Getting release info from GitHub API..."
RELEASE_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_REPOSITORY/releases/tags/$GITHUB_REF_NAME)

if ! echo "$RELEASE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo "Failed to get release info"
  echo "Response: $RELEASE_RESPONSE"
  exit 1
fi

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r '.id')
echo "Found release ID: $RELEASE_ID"

# 获取 assets
echo "Getting release assets..."
ASSETS_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID/assets)

if ! echo "$ASSETS_RESPONSE" | jq -e '. | length' > /dev/null 2>&1; then
  echo "Failed to get assets"
  echo "Response: $ASSETS_RESPONSE"
  exit 1
fi

ASSET_COUNT=$(echo "$ASSETS_RESPONSE" | jq 'length')
echo "Found $ASSET_COUNT assets to download"

if [ "$ASSET_COUNT" -eq 0 ]; then
  echo "No assets found to download"
  exit 1
fi

# 下载每个 asset
echo "Starting downloads..."
echo "$ASSETS_RESPONSE" | jq -r '.[] | "\(.id) \(.name)"' | while read -r asset_id name; do
  echo "Downloading: $name (ID: $asset_id)"
  
  # 使用 GitHub API 下载
  if curl -L -H "Authorization: token $GITHUB_TOKEN" \
         -H "Accept: application/octet-stream" \
         --fail --show-error --silent \
         --connect-timeout 30 \
         --max-time 300 \
         -o "$name" \
         "https://api.github.com/repos/$GITHUB_REPOSITORY/releases/assets/$asset_id"; then
    echo "Downloaded: $name ($(du -h "$name" | cut -f1))"
  else
    echo "Failed to download: $name"
    exit 1
  fi
done

echo "All downloads completed successfully!"
echo "Downloaded files:"
ls -la
