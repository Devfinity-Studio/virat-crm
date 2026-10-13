import re

with open('src/app/sales/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_print = """                        <Button
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                          onClick={() => {
                            window.open(`/sales/print/${selectedSale.id}`, "_blank");
                          }}
                        >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Invoice
                        </Button>"""

new_print = """                        <Link
                          href={`/sales/print/${selectedSale.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 h-9"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print Invoice
                        </Link>"""

content = content.replace(old_print, new_print)

with open('src/app/sales/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
