#!/bin/bash

set -e

echo "Getting release info for tag: $GITHUB_REF_NAME"

# 验证环境变量
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set"
  exit 1
fi

# 等待确保 cleanup 完成
echo "Waiting 15 seconds for cleanup to complete..."
sleep 15

# 首先尝试通过标签获取 release（与 cleanup-release 相同的方法）
RELEASE_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_REPOSITORY/releases/tags/$GITHUB_REF_NAME)

# 如果直接通过标签获取失败，则从所有 releases 中查找
if ! echo "$RELEASE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo "Direct tag lookup failed, searching in all releases..."
  echo "Direct response: $RELEASE_RESPONSE"
  
  ALL_RELEASES=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases)
  
  RELEASE_RESPONSE=$(echo "$ALL_RELEASES" | jq ".[] | select(.tag_name == \"$GITHUB_REF_NAME\")")
  
  if ! echo "$RELEASE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "Could not find release for tag $GITHUB_REF_NAME"
    echo "Available releases:"
    echo "$ALL_RELEASES" | jq -r '.[] | "- \(.tag_name) (ID: \(.id))"' | head -10
    exit 1
  fi
fi

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r '.id')
TAG_NAME=$(echo "$RELEASE_RESPONSE" | jq -r '.tag_name')
ASSETS=$(echo "$RELEASE_RESPONSE" | jq -c '.assets')

echo "Found release: $TAG_NAME (ID: $RELEASE_ID)"
echo "Assets count: $(echo "$ASSETS" | jq length)"

# 输出到 GitHub Actions outputs
echo "release_id=$RELEASE_ID" >> $GITHUB_OUTPUT
echo "tag_name=$TAG_NAME" >> $GITHUB_OUTPUT
echo "assets<<EOF" >> $GITHUB_OUTPUT
echo "$ASSETS" >> $GITHUB_OUTPUT
echo "EOF" >> $GITHUB_OUTPUT

echo "Release info prepared for COS upload"
