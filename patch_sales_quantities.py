import re

with open('src/app/sales/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add calculations right before `const handleSubmit = ...` or similar. Let's find `  const clearForm = () => {`
# and insert the calculation logic before it.
calc_logic = """  const mainQtyTotal = saleItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
  const freeQtyTotal = freeItems.reduce((acc, item) => acc + (parseInt(item.freeQty) || 0), 0);
  const totalQty = mainQtyTotal + freeQtyTotal;

  const clearForm = () => {"""

content = content.replace("  const clearForm = () => {", calc_logic)

# Replace the empty inputs
old_inputs = """                  <div className="flex flex-col space-y-1 w-48 ml-auto">
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Main Qty:</span> <input type="text" className="w-24 border border-gray-400 bg-white px-1"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Free Qty:</span> <input type="text" className="w-24 border border-gray-400 bg-white px-1"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Total Qty:</span> <input type="text" className="w-24 border border-gray-400 bg-white px-1"/></div>
                  </div>"""

new_inputs = """                  <div className="flex flex-col space-y-1 w-48 ml-auto">
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Main Qty:</span> <input type="text" readOnly value={mainQtyTotal} className="w-24 border border-gray-400 bg-gray-100 px-1 text-right font-semibold"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Free Qty:</span> <input type="text" readOnly value={freeQtyTotal} className="w-24 border border-gray-400 bg-gray-100 px-1 text-right font-semibold"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Total Qty:</span> <input type="text" readOnly value={totalQty} className="w-24 border border-gray-400 bg-gray-100 px-1 text-right font-semibold"/></div>
                  </div>"""

content = content.replace(old_inputs, new_inputs)

with open('src/app/sales/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
