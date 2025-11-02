#!/bin/bash

# 确保在正确的目录
cd "$(dirname "$0")/apps/api"

# 启动 API
node dist/apps/api/src/main.js
