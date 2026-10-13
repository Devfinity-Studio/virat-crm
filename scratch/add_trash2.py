import re
with open('src/app/sales/[id]/edit/page.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'Plus,(\s*)\} from "lucide-react";', r'Plus,\n  Trash2,\1} from "lucide-react";', content)

with open('src/app/sales/[id]/edit/page.tsx', 'w') as f:
    f.write(content)
print('Trash2 added')
