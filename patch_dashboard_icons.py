import re

with open('src/app/_components/dashboard/DashboardView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the dynamic regex with link.iconBg
content = content.replace(
    "${link.color.replace(/bg-[a-z]+-50/, '').replace(/text-([a-z]+)-[0-9]+/, 'bg-$1-500')}",
    "${link.iconBg}"
)

# Now add iconBg to every link definition based on the text color
def add_icon_bg(match):
    full_match = match.group(0)
    color = match.group(1)
    return full_match + f',\n      iconBg: "bg-{color}-500"'

# Match color: "bg-xxx-50 text-yyy-600"
content = re.sub(r'color:\s*"[^"]*text-([a-z]+)-[0-9]+"', add_icon_bg, content)

with open('src/app/_components/dashboard/DashboardView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
