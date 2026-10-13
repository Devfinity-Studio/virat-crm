import re

with open('src/app/_components/layout/DesktopSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Chevron imports
if 'ChevronDown' not in content:
    content = content.replace('PanelLeftOpen,\n}', 'PanelLeftOpen,\n  ChevronDown,\n  ChevronUp,\n}')

# 2. Add state
if 'expandedCategories' not in content:
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
                    className="w-full flex items-center justify-between px-5 text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3 mt-4 hover:text-slate-600 transition-colors"
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

# 5. Fix sticky and padding
old_container = """      className={cn(
        "border-border flex flex-col h-full transition-all duration-300 ease-in-out bg-green-50/40 dark:bg-green-950/20",
        !isMobile && "hidden border-r md:flex",
        isCollapsed ? "w-20" : "w-64"
      )}"""
new_container = """      className={cn(
        "border-border flex flex-col sticky top-0 h-screen transition-all duration-300 ease-in-out bg-green-50/40 dark:bg-green-950/20",
        !isMobile && "hidden border-r md:flex",
        isCollapsed ? "w-20" : "w-64"
      )}"""
content = content.replace(old_container, new_container)

old_nav_container = """<div className="no-scrollbar h-[calc(100vh-64px)] overflow-y-auto p-3">"""
new_nav_container = """<div className="no-scrollbar h-[calc(100vh-64px)] overflow-y-auto p-4">"""
content = content.replace(old_nav_container, new_nav_container)

# Sleeker link padding
old_link = """isCollapsed ? "justify-center px-2" : "px-4 space-x-3","""
new_link = """isCollapsed ? "justify-center px-2" : "px-5 space-x-3","""
content = content.replace(old_link, new_link)

with open('src/app/_components/layout/DesktopSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
