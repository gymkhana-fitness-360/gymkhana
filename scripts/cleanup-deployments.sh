#!/bin/bash

# Keep only the latest deployment (currently aliased to gymflo.vercel.app)
KEEP_URL="gymflo-n06bcgjba-gymkhanas-projects.vercel.app"

echo "🧹 Cleaning up old Vercel deployments..."
echo "✅ Keeping: $KEEP_URL"
echo ""

# Get all deployment URLs
vercel ls --json | jq -r '.deployments[].url' | while read url; do
  if [ "$url" != "$KEEP_URL" ]; then
    echo "🗑️  Deleting: $url"
    vercel rm "$url" --yes --scope gymkhanas-projects 2>/dev/null || true
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo "Remaining deployments:"
vercel ls | head -10
