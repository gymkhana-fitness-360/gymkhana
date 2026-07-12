#!/bin/bash

# Export from Local Database to Production
# This script copies all data from your local PostgreSQL to Supabase production

set -e

echo "🚀 Exporting data from local to production..."
echo ""
echo "⚠️  Make sure your local PostgreSQL is running!"
echo ""

# Check if local database is accessible
echo "Checking local database connection..."
if ! psql "postgresql://user:password@localhost:5432/gymkhana" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to local database at localhost:5432"
    echo "   Please start your PostgreSQL server first:"
    echo "   brew services start postgresql@14"
    echo "   (or whatever version you're using)"
    exit 1
fi

echo "✅ Local database is accessible"
echo ""

# Get production URL
cd "$(dirname "$0")"
PROD_URL=$(grep DATABASE_URL .env.production | sed 's/6543/5432/g' | sed 's/?pgbouncer=true&connection_limit=1//g' | cut -d'=' -f2- | tr -d '"' | tr -d '\n')

if [ -z "$PROD_URL" ]; then
    echo "❌ Could not find production DATABASE_URL in .env.production"
    echo "   Run: vercel env pull .env.production --environment=production"
    exit 1
fi

echo "✅ Production database URL loaded"
echo ""

# Run the export/import script (repo root)
echo "Starting data transfer..."
echo ""

SOURCE_DATABASE_URL='postgresql://user:password@localhost:5432/gymkhana' \
DATABASE_URL="$PROD_URL" \
npx tsx scripts/export-import-data.ts

echo ""
echo "✅ Export complete!"
echo ""
echo "Next steps:"
echo "1. Verify data in production: https://your-app.vercel.app/dashboard"
echo "2. Check member count and payments"
echo "3. Test the overdue tracking feature"
