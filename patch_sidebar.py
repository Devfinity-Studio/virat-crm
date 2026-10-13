import re

with open('src/app/_components/layout/DesktopSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Chevron imports
content = content.replace('PanelLeftOpen,\n}', 'PanelLeftOpen,\n  ChevronDown,\n  ChevronUp,\n}')

# 2. Add state
content = content.replace('const [isCollapsed, setIsCollapsed] = useState(false);', 'const [isCollapsed, setIsCollapsed] = useState(false);\n  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ "Main": true, "Administration": true, "Settings": true });')

# 3. Update Render logic
old_header = """                {!isCollapsed && (
                  <h3 className="px-4 text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 mt-2">
                    {category.title}
                  </h3>
                )}"""
new_header = """                {!isCollapsed && (
                  <button 
                    onClick={() => setExpandedCategories(prev => ({...prev, [category.title]: !prev[category.title]}))}
                    className="w-full flex items-center justify-between px-4 text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 mt-2 hover:text-slate-600 transition-colors"
                  >
                    <span>{category.title}</span>
                    {expandedCategories[category.title] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}"""
content = content.replace(old_header, new_header)

# 4. Wrap links
old_links_map = "{visibleLinks.map((link) => {"
new_links_map = "{(isCollapsed || expandedCategories[category.title]) && visibleLinks.map((link) => {"
content = content.replace(old_links_map, new_links_map)

# 5. Fix closing brace (the map end)
# Since the map end is just `})}` and we wrapped it conditionally:
# old: `})}`
# new: `})}` 
# actually `{(isCollapsed || expandedCategories[category.title]) && visibleLinks.map((link) => { ... })}`
# So we don't need to change the closing brace since `&&` wrapper ends with `}` which matches the original. Wait, the original ` visibleLinks.map(...)` was inside `{ }`. 
# So `{ visibleLinks.map(...) }` becomes `{ condition && visibleLinks.map(...) }`.
# The regex replace for old_links_map does exactly that.

with open('src/app/_components/layout/DesktopSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
