#!/bin/bash
echo "GitHub ref: $GITHUB_REF"
echo "Tag name: $GITHUB_REF_NAME"
echo "Repository: $GITHUB_REPOSITORY"
echo "Is tag push: ${GITHUB_REF:0:10} == 'refs/tags/'"
echo "GITHUB_TOKEN exists: [${#GITHUB_TOKEN} > 0]"
node --version
npm --version
