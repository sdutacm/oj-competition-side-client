#!/bin/bash

# Debug GitHub token and permissions
echo "Debugging GitHub environment..."
echo "Repository: $GITHUB_REPOSITORY"
echo "Actor: $GITHUB_ACTOR"
echo "Token exists: $([ -n "$GITHUB_TOKEN" ] && echo "true" || echo "false")"
echo "Token length: ${#GITHUB_TOKEN}"

# 尝试不同的 API 调用
echo "Testing different API endpoints..."

# 测试基本用户信息
echo "Testing /user endpoint:"
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq -r '.login // "Failed"' || echo "curl failed"

# 测试仓库信息
echo "Testing repository endpoint:"
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/$GITHUB_REPOSITORY | jq -r '.name // "Failed"' || echo "curl failed"
