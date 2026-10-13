import re

with open('src/server/api/routers/crm.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add missing fields to output schema
replacement = """            name: z.string(),
            fatherName: z.string().nullable().optional(),
            landlineNo: z.string().nullable().optional(),
            marriageDate: z.any().nullable().optional(),
"""
content = content.replace('            name: z.string(),\n', replacement)

with open('src/server/api/routers/crm.ts', 'w', encoding='utf-8') as f:
    f.write(content)
