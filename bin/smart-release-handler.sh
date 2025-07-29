#!/bin/bash

set -e

echo "Smart Release Handler - handling concurrent release creation"

# 检查环境变量
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

# 函数：检查 Release 是否存在
check_release_exists() {
  local response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases/tags/$GITHUB_REF_NAME)
  
  if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
    echo "true"
  else
    echo "false"
  fi
}

# 函数：创建 Release
create_release() {
  echo "Creating release $GITHUB_REF_NAME..."
  
  local response=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases \
    -d "{
      \"tag_name\": \"$GITHUB_REF_NAME\",
      \"target_commitish\": \"master\",
      \"name\": \"${GITHUB_REF_NAME#v}\",
      \"body\": \"## 版本 ${GITHUB_REF_NAME#v}\\n\\n自动构建发布\",
      \"draft\": false,
      \"prerelease\": false
    }")
  
  if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Release created successfully"
    return 0
  else
    local error=$(echo "$response" | jq -r '.message // "Unknown error"')
    echo "❌ Failed to create release: $error"
    return 1
  fi
}

# 主逻辑
echo "Checking if release $GITHUB_REF_NAME exists..."

if [ "$(check_release_exists)" = "true" ]; then
  echo "✅ Release already exists, will attach files to it"
else
  echo "Release does not exist, attempting to create it..."
  
  # 尝试创建 Release，如果失败（可能因为另一个进程已创建），则重新检查
  if ! create_release; then
    echo "Failed to create release, checking if it was created by another process..."
    sleep 2
    
    if [ "$(check_release_exists)" = "true" ]; then
      echo "✅ Release now exists (created by another process), proceeding"
    else
      echo "❌ Release still does not exist and creation failed"
      exit 1
    fi
  fi
fi

echo "Smart Release Handler completed successfully"
