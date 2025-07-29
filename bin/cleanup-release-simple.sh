#!/bin/bash

set -e

echo "Starting simple release cleanup for tag: $GITHUB_REF_NAME"

# 验证环境变量
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set"
  exit 1
fi

echo "Getting release for tag: $GITHUB_REF_NAME"

# 获取 release 信息
RELEASE_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_REPOSITORY/releases/tags/$GITHUB_REF_NAME)

if ! echo "$RELEASE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo "Could not find release for tag $GITHUB_REF_NAME"
  exit 1
fi

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r '.id')
echo "Found release ID: $RELEASE_ID"

# 获取 assets
ASSETS_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID/assets)

echo "Current release assets:"
echo "$ASSETS_RESPONSE" | jq -r '.[] | "- \(.name)"'

# 删除不需要的文件（yml, yaml, blockmap）
UNWANTED_ASSETS=$(echo "$ASSETS_RESPONSE" | jq -r '.[] | select(.name | test("\\.(yml|yaml|blockmap)$")) | .id')

if [ -n "$UNWANTED_ASSETS" ]; then
  echo "Deleting unwanted files..."
  echo "$UNWANTED_ASSETS" | while read -r asset_id; do
    if [ -n "$asset_id" ]; then
      ASSET_NAME=$(echo "$ASSETS_RESPONSE" | jq -r ".[] | select(.id == $asset_id) | .name")
      echo "Deleting: $ASSET_NAME"
      
      curl -s -X DELETE \
        -H "Authorization: token $GITHUB_TOKEN" \
        https://api.github.com/repos/$GITHUB_REPOSITORY/releases/assets/$asset_id
    fi
  done
else
  echo "No unwanted files found"
fi

# 检查并发布 Draft release
IS_DRAFT=$(echo "$RELEASE_RESPONSE" | jq -r '.draft')
if [ "$IS_DRAFT" = "true" ]; then
  echo "Publishing draft release..."
  
  curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID \
    -d '{"draft": false}'
  
  echo "Release published"
else
  echo "Release is already published"
fi

echo "Cleanup completed!"
