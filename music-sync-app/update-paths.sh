#!/bin/bash

# Update import paths in client files
find client/app client/components client/hooks -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/components/|from "@/components/|g'
find client/app client/components client/hooks -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/hooks/|from "@/hooks/|g'
find client/app client/components client/hooks -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/lib/|from "@/lib/|g'

# Fix AuthContext import in use-auth.tsx
sed -i 's|import { AuthContext } from "@/components/auth-provider"|import { AuthContext } from "@/components/auth-provider"|g' client/hooks/use-auth.tsx

echo "Path updates completed!"
