#!/bin/bash

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

# 使用 jq 处理每个 asset，但构建正确的URL
jq -r '.[] | .name' assets.json | while read -r name; do
  echo "Downloading: $name"
  
  # 构建正确的下载URL（使用tag而不是untagged）
  CORRECT_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/${name}"
  echo "   URL: $CORRECT_URL"
  
  # 下载文件，使用认证和更详细的错误处理
  if curl -L -H "Authorization: token $GITHUB_TOKEN" \
         -H "Accept: application/octet-stream" \
         --fail --show-error --silent \
         --connect-timeout 30 \
         --max-time 300 \
         -o "$name" "$CORRECT_URL"; then
    echo "Downloaded: $name ($(du -h "$name" | cut -f1))"
    
    # 验证文件不为空
    if [ ! -s "$name" ]; then
      echo "Downloaded file is empty: $name"
      exit 1
    fi
  else
    echo "Failed to download: $name"
    echo "curl exit code: $?"
    # 尝试无认证下载（对于公开文件）
    echo "🔄 Trying without authentication..."
    if curl -L --fail --show-error --silent \
           --connect-timeout 30 \
           --max-time 300 \
           -o "$name" "$CORRECT_URL"; then
      echo "Downloaded without auth: $name ($(du -h "$name" | cut -f1))"
    else
      echo "Failed even without authentication"
      echo "Trying alternative URL construction..."
      
      # 最后尝试：使用GitHub API下载
      ASSET_ID=$(echo "$RELEASE_ASSETS" | jq -r ".[] | select(.name == \"$name\") | .id")
      if [ -n "$ASSET_ID" ] && [ "$ASSET_ID" != "null" ]; then
        echo "Trying GitHub API download (Asset ID: $ASSET_ID)..."
        if curl -L -H "Authorization: token $GITHUB_TOKEN" \
               -H "Accept: application/octet-stream" \
               --fail --show-error --silent \
               --connect-timeout 30 \
               --max-time 300 \
               -o "$name" \
               "https://api.github.com/repos/${REPO}/releases/assets/${ASSET_ID}"; then
          echo "Downloaded via API: $name ($(du -h "$name" | cut -f1))"
        else
          echo "API download also failed"
          exit 1
        fi
      else
        echo "Could not find asset ID"
        exit 1
      fi
    fi
  fi
done

echo "Downloaded files:"
ls -la
