#!/bin/bash

set -e  # 启用错误时退出

echo "Starting simple release cleanup for tag: $GITHUB_REF_NAME"

# 验证环境变量
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set"
  exit 1
fi

# 测试 API 连接
USER_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user)
if ! echo "$USER_RESPONSE" | jq -e '.login' > /dev/null 2>&1; then
  echo "Cannot authenticate with GitHub API"
  echo "Response: $USER_RESPONSE"
  exit 1
fi
echo "GitHub API authentication successful"

echo "Getting release for tag: $GITHUB_REF_NAME"

# 使用重试机制查找 Release，因为可能需要时间创建
MAX_ATTEMPTS=12
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS to find release..."
  
  RELEASE_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases/tags/$GITHUB_REF_NAME)
  
  if echo "$RELEASE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "Found release!"
    break
  fi
  
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "Could not find release for tag $GITHUB_REF_NAME after $MAX_ATTEMPTS attempts"
    echo "Response: $RELEASE_RESPONSE"
    
    # 创建一个新的 Release
    echo "Creating new release for tag $GITHUB_REF_NAME"
    CREATE_RESPONSE=$(curl -s -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Content-Type: application/json" \
      https://api.github.com/repos/$GITHUB_REPOSITORY/releases \
      -d "{
        \"tag_name\": \"$GITHUB_REF_NAME\",
        \"target_commitish\": \"master\",
        \"name\": \"${GITHUB_REF_NAME#v}\",
        \"body\": \"## 版本 ${GITHUB_REF_NAME#v}\\n\\n### 改进\\n- 优化构建和发布流程\\n- 修复已知问题\\n\\n此版本由自动化脚本创建。\",
        \"draft\": false,
        \"prerelease\": false
      }")
    
    if echo "$CREATE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
      echo "Successfully created new release"
      RELEASE_RESPONSE="$CREATE_RESPONSE"
      break
    else
      echo "Failed to create new release"
      echo "Response: $CREATE_RESPONSE"
      exit 1
    fi
  fi
  
  echo "Release not found yet, waiting 30 seconds..."
  sleep 30
  ATTEMPT=$((ATTEMPT + 1))
done

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

echo "Current release assets:"
echo "$ASSETS_RESPONSE" | jq -r '.[] | "- \(.name) (ID: \(.id))"'

# 查找并删除不需要的文件
echo "Looking for unwanted assets..."

# 删除 .yml, .yaml, .blockmap 文件
echo "Finding .yml, .yaml, .blockmap files..."
YML_ASSETS=$(echo "$ASSETS_RESPONSE" | jq -r 'if type == "array" then .[] | select(.name | test("\\.(yml|yaml|blockmap)$")) | .id else empty end' 2>/dev/null || echo "")

# 删除不带架构标识的 Windows 文件  
echo "Finding Windows files without architecture identifiers..."
WINDOWS_NO_ARCH_ASSETS=$(echo "$ASSETS_RESPONSE" | jq -r 'if type == "array" then .[] | select(.name | test("windows.*\\.(exe)$") and (.name | test("_(x64|arm64)_") | not)) | .id else empty end' 2>/dev/null || echo "")

# 合并所有要删除的 assets，过滤空行
ALL_UNWANTED_ASSETS=""
if [ -n "$YML_ASSETS" ]; then
  ALL_UNWANTED_ASSETS="$YML_ASSETS"
fi
if [ -n "$WINDOWS_NO_ARCH_ASSETS" ]; then
  if [ -n "$ALL_UNWANTED_ASSETS" ]; then
    ALL_UNWANTED_ASSETS="$ALL_UNWANTED_ASSETS\n$WINDOWS_NO_ARCH_ASSETS"
  else
    ALL_UNWANTED_ASSETS="$WINDOWS_NO_ARCH_ASSETS"
  fi
fi

if [ -n "$ALL_UNWANTED_ASSETS" ]; then
  echo "Found unwanted assets to delete:"
  
  # 显示要删除的文件列表
  echo "$ASSETS_RESPONSE" | jq -r 'if type == "array" then .[] | select((.name | test("\\.(yml|yaml|blockmap)$")) or (.name | test("windows.*\\.(exe)$") and (.name | test("_(x64|arm64)_") | not))) | "- \(.name) (ID: \(.id))" else empty end' 2>/dev/null || echo "Error displaying file list"
  
  echo -e "$ALL_UNWANTED_ASSETS" | while read -r asset_id; do
    if [ -n "$asset_id" ] && [ "$asset_id" != "null" ] && [ "$asset_id" != "" ]; then
      ASSET_NAME=$(echo "$ASSETS_RESPONSE" | jq -r "if type == \"array\" then .[] | select(.id == $asset_id) | .name else \"unknown\" end" 2>/dev/null)
      echo "Deleting: $ASSET_NAME (ID: $asset_id)"
      
      DELETE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X DELETE \
        -H "Authorization: token $GITHUB_TOKEN" \
        https://api.github.com/repos/$GITHUB_REPOSITORY/releases/assets/$asset_id)
      
      if [ "$DELETE_RESPONSE" = "204" ]; then
        echo "Successfully deleted: $ASSET_NAME"
      else
        echo "Failed to delete: $ASSET_NAME (HTTP: $DELETE_RESPONSE)"
      fi
    fi
  done
else
  echo "No unwanted files found!"
fi

echo "Cleanup completed successfully!"

# 检查并取消 Draft 状态
echo "Checking if release is in draft state..."
IS_DRAFT=$(echo "$RELEASE_RESPONSE" | jq -r '.draft')
if [ "$IS_DRAFT" = "true" ]; then
  echo "Release is in draft state, converting to published release..."
  
  UPDATE_RESPONSE=$(curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    https://api.github.com/repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID \
    -d '{
      "draft": false,
      "prerelease": false
    }')
  
  if echo "$UPDATE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "Successfully published release!"
  else
    echo "Failed to publish release"
    echo "Response: $UPDATE_RESPONSE"
  fi
else
  echo "Release is already published"
fi

echo "All operations completed!"
