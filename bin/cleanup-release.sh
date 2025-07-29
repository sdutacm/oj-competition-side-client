#!/bin/bash

set -e

echo "Starting simple release cleanup for tag: $GITHUB_REF_NAME"

echo "Checking if release exists..."
if ! gh release view "$GITHUB_REF_NAME" &> /dev/null; then
    echo "Release $GITHUB_REF_NAME not found"
    exit 1
fi

echo "Found release $GITHUB_REF_NAME, listing assets..."
gh release view "$GITHUB_REF_NAME" --json assets --jq '.assets[].name'

echo "Deleting unwanted files..."

# 删除 .yml 文件
echo "Deleting .yml files..."
for file in $(gh release view "$GITHUB_REF_NAME" --json assets --jq '.assets[] | select(.name | endswith(".yml")) | .name'); do
    echo "Deleting: $file"
    gh release delete-asset "$GITHUB_REF_NAME" "$file" --yes || echo "Failed to delete $file"
done

# 删除 .blockmap 文件
echo "Deleting .blockmap files..."
for file in $(gh release view "$GITHUB_REF_NAME" --json assets --jq '.assets[] | select(.name | endswith(".blockmap")) | .name'); do
    echo "Deleting: $file"
    gh release delete-asset "$GITHUB_REF_NAME" "$file" --yes || echo "Failed to delete $file"
done

# 删除没有架构标识的 Windows 文件
echo "Deleting Windows files without architecture identifiers..."
gh release view "$GITHUB_REF_NAME" --json assets --jq -r '.assets[] | select(.name | test("windows.*\\.exe$") and (.name | test("_(x64|arm64)_") | not)) | .name' | while read -r file; do
    if [ -n "$file" ]; then
        echo "Deleting: $file"
        gh release delete-asset "$GITHUB_REF_NAME" "$file" --yes || echo "Failed to delete $file"
    fi
done

echo "Cleanup completed!"

# 检查是否为 Draft 并发布
echo "Checking release status..."
IS_DRAFT=$(gh release view "$GITHUB_REF_NAME" --json isDraft --jq '.isDraft')
if [ "$IS_DRAFT" = "true" ]; then
    echo "Release is draft, publishing..."
    gh release edit "$GITHUB_REF_NAME" --draft=false
    echo "Release published!"
else
    echo "Release is already published"
fi

echo "All operations completed!"
