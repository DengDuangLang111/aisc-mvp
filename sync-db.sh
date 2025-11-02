#!/bin/bash

# 数据库同步脚本
echo "🔄 同步数据库 Schema..."

cd /Users/knight/study_oasis_simple/apps/api

# 设置环境变量
export DATABASE_URL="postgresql://postgres.rtdbfisxskunrkjmjpvv:DuDu7622-Arknights@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

# 删除可能导致问题的配置文件
if [ -f "prisma.config.js" ]; then
    echo "📝 备份 prisma.config.js..."
    mv prisma.config.js prisma.config.js.bak
fi

if [ -f "prisma.config.ts" ]; then
    echo "📝 备份 prisma.config.ts..."
    mv prisma.config.ts prisma.config.ts.bak 2>/dev/null || true
fi

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 推送 Schema 到数据库
echo "📤 推送 Schema 到数据库..."
npx prisma db push --skip-generate

echo "✅ 数据库同步完成！"
