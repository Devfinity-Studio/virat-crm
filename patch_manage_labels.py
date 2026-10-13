import re

with open('src/app/admin/manage/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<Label>Code Series Prefix</Label>', '<Label>Starting E-Code</Label>')
content = content.replace('placeholder="e.g. MGR-"', 'placeholder="e.g. MGR-0001"')
content = content.replace('<TableHead>Code Series</TableHead>', '<TableHead>E-Code Series</TableHead>')

with open('src/app/admin/manage/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
