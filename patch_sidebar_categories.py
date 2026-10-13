import re

with open('src/app/_components/layout/DesktopSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the entire linkCategories array.
# First, extract everything before `const linkCategories = [`
# and everything after the `];` that closes it.

start_idx = content.find('  const linkCategories = [')
end_idx = content.find('  ];\n\n  return (')

if start_idx != -1 and end_idx != -1:
    new_categories = """  const linkCategories = [
    {
      title: "Main",
      links: [
        {
          href: "/",
          label: "Dashboard",
          icon: Home,
          hidden: !getIsFeatureEnabled("dashboard"),
        },
        {
          href: "/crm",
          label: "Customer Master",
          icon: Contact,
          hidden: !getIsFeatureEnabled("crm"),
        },
      ],
    },
    {
      title: "Sales & Operations",
      links: [
        {
          href: "/sales",
          label: "Sales Register",
          icon: ShoppingBag,
          hidden: !getIsFeatureEnabled("sales"),
        },
        {
          href: "/replacements",
          label: "Replacements",
          icon: RefreshCcw,
          hidden: !getIsFeatureEnabled("sales"),
        },
        {
          href: "/inventory",
          label: "Inventory",
          icon: FileText,
          hidden: !getIsFeatureEnabled("inventory"),
        },
        {
          href: "/reports",
          label: "Daily Reports",
          icon: FileText,
          hidden: !getIsFeatureEnabled("reports"),
        },
        {
          href: "/reports/mileage",
          label: "Mileage Reports",
          icon: FileText,
          hidden: !getIsFeatureEnabled("reports"),
        },
      ],
    },
    {
      title: "HR Transactions",
      links: [
        {
          href: "/attendance",
          label: "Workforce",
          icon: Users,
          hidden: !getIsFeatureEnabled("workforce"),
        },
        {
          href: "/reports/field-support",
          label: "Field Support Reports",
          icon: FileText,
          hidden: !getIsFeatureEnabled("field-support") || !(isManager || isAdmin),
        },
        {
          href: "/documents",
          label: "Documents",
          icon: FileText,
          hidden: !getIsFeatureEnabled("documents"),
        },
      ],
    },
    {
      title: "Administration",
      links: [
        {
          href: "/admin/live-map",
          label: "Live Field View",
          icon: MapPin,
          hidden:
            !getIsFeatureEnabled("live-map") || !(isManager ?? isAdmin ?? false),
        },
        {
          href: "/admin/reports",
          label: "Intelligence Reports",
          icon: BarChart3,
          hidden:
            !getIsFeatureEnabled("reports") || !(isManager ?? isAdmin ?? false),
        },
        {
          href: "/admin/org-chart",
          label: "Org Chart",
          icon: Network,
          hidden:
            !getIsFeatureEnabled("org-chart") || !(isManager ?? isAdmin ?? false),
        },
        {
          href: "/admin/feature-access",
          label: "Feature Access",
          icon: ShieldCheck,
          hidden: !isAdmin,
        },
        {
          href: "/admin/users",
          label: "User Management",
          icon: Users,
          hidden: !isAdmin,
        },
        {
          href: "/admin/exports",
          label: "Bulk Exports",
          icon: Download,
          hidden: !isAdmin,
        },
        {
          href: "/admin/imports",
          label: "Bulk Imports",
          icon: Upload,
          hidden: !isAdmin,
        },
      ],
    },
    {
      title: "Settings",
      links: [
        {
          href: "/admin/manage",
          label: "Manage Organization",
          icon: Sliders,
          hidden: !isAdmin,
        },
        {
          href: "/admin/developer",
          label: "Developer Console",
          icon: Sliders,
          hidden: user?.role !== "Developer",
        },
        { href: "/profile", label: "My Profile", icon: User },
      ],
    },"""
    
    new_content = content[:start_idx] + new_categories + content[end_idx:]
    
    # Also I need to add state for the new expandedCategories keys
    state_find = 'const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ "Main": true, "Administration": true, "Settings": true });'
    state_replace = 'const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ "Main": true, "Sales & Operations": true, "HR Transactions": true, "Administration": true, "Settings": true });'
    new_content = new_content.replace(state_find, state_replace)
    
    with open('src/app/_components/layout/DesktopSidebar.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
        
