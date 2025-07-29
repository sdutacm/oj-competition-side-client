#!/bin/bash

set -e

echo "Checking for existing release: $GITHUB_REF_NAME"

# 检查是否有环境变量
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set"
  exit 1
fi

if [ -z "$GITHUB_REPOSITORY" ]; then
  echo "GITHUB_REPOSITORY not set"
  exit 1
fi

if [ -z "$GITHUB_REF_NAME" ]; then
  echo "GITHUB_REF_NAME not set"
  exit 1
fi

# 检查是否存在同名的 Release
echo "Checking if release $GITHUB_REF_NAME already exists..."
EXISTING_RELEASE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_REPOSITORY/releases/tags/$GITHUB_REF_NAME)

if echo "$EXISTING_RELEASE" | jq -e '.id' > /dev/null 2>&1; then
  RELEASE_ID=$(echo "$EXISTING_RELEASE" | jq -r '.id')
  echo "Found existing release with ID: $RELEASE_ID"
  echo "Deleting existing release to avoid conflicts..."
  
  DELETE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
    -X DELETE \
    -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID)
  
  if [ "$DELETE_RESPONSE" = "204" ]; then
    echo "Successfully deleted existing release"
  else
    echo "Failed to delete existing release (HTTP: $DELETE_RESPONSE)"
    # 不要退出，让 electron-builder 处理
  fi
else
  echo "No existing release found, proceeding with build"
fi

echo "Pre-build cleanup completed"
