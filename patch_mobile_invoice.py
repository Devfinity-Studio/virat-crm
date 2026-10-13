import re

with open('src/app/sales/print/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_wrapper = """    <div className="min-h-screen bg-white text-black p-8 font-sans">
      <div className="mx-auto max-w-4xl">
        <div className="border-2 border-black p-4">"""

new_wrapper = """    <div className="min-h-screen bg-gray-100 text-black p-2 sm:p-8 font-sans">
      <div className="w-full overflow-x-auto print:overflow-visible">
        <div className="mx-auto max-w-4xl min-w-[800px] print:min-w-0 print:w-full bg-white shadow-md print:shadow-none mb-8">
          <div className="border-2 border-black p-6 sm:p-8 m-2 sm:m-0 print:m-0 print:border-0">"""

content = content.replace(old_wrapper, new_wrapper)

with open('src/app/sales/print/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
