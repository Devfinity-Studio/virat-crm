import re

with open('src/app/admin/users/page.tsx', 'r') as f:
    content = f.read()

# Remove the inline AddUserForm component entirely
new_content = re.sub(r'function AddUserForm.*?\{.*?\n\}\n*', '', content, flags=re.DOTALL)

# Add the import
if 'import { AddUserForm }' not in new_content:
    new_content = new_content.replace('import { FeatureGate } from "@/app/_components/auth/FeatureGate";', 'import { FeatureGate } from "@/app/_components/auth/FeatureGate";\nimport { AddUserForm } from "./AddUserForm";')

with open('src/app/admin/users/page.tsx', 'w') as f:
    f.write(new_content)
