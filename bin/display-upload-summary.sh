#!/bin/bash

echo "COS upload completed successfully!"
echo "Version: $TAG_NAME"

if [ -n "$COS_DOMAIN" ]; then
  echo "Custom Domain: $COS_DOMAIN"
  echo "Release Directory: $CDN_URL/oj-competition-side-client/release/$TAG_NAME/"
  echo "Index File: $CDN_URL/oj-competition-side-client/release/$TAG_NAME/index.json"
else
  echo "CDN Base URL: $CDN_URL"
  echo "Release Directory: $CDN_URL/oj-competition-side-client/release/$TAG_NAME/"
  echo "Index File: $CDN_URL/oj-competition-side-client/release/$TAG_NAME/index.json"
fi
