import re

with open('src/app/sales/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove receivedAmount state and clearForm usage
content = content.replace('  const [receivedAmount, setReceivedAmount] = useState("");\n', '')
content = content.replace('    setReceivedAmount("");\n', '')

# 2. In handleSubmit, map receivedAmount to advancePaymentAmount
old_submit_received = '      receivedAmount: receivedAmount === "" ? "0" : receivedAmount,'
new_submit_received = '      receivedAmount: advancePaymentAmount === "" ? "0" : advancePaymentAmount,'
content = content.replace(old_submit_received, new_submit_received)

# 3. Add balanceAmount calculation in the render function before return (or just inline)
# Wait, let's just insert it before `return (`
calc_balance = """  const parsedInvoice = parseFloat(invoiceAmount) || 0;
  const parsedAdvance = parseFloat(advancePaymentAmount) || 0;
  const balanceAmount = (parsedInvoice - parsedAdvance).toFixed(2);

  return ("""
content = content.replace("  return (", calc_balance, 1)

# 4. Remove Received Amt UI and update Bal Amount UI
old_ui_amounts = """                  <div className="flex flex-col space-y-1 w-64">
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Invoice Amt:</span> <input type="text" value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value)} className="w-32 border border-gray-400 bg-white px-1"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Advance Amt:</span> <input type="text" value={advancePaymentAmount} onChange={e=>setAdvancePaymentAmount(e.target.value)} className="w-32 border border-gray-400 bg-white px-1"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Received Amt:</span> <input type="text" value={receivedAmount} onChange={e=>setReceivedAmount(e.target.value)} className="w-32 border border-gray-400 bg-white px-1"/></div>
                  </div>
                  
                  <div className="flex flex-col ml-4 mr-4 w-32 justify-end mb-1">
                    <div className="text-center font-bold mb-1">Bal Amount</div>
                    <input type="text" disabled className="w-full border border-gray-400 bg-white px-1 py-1 h-6"/>
                  </div>"""

new_ui_amounts = """                  <div className="flex flex-col space-y-1 w-64">
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Invoice Amt:</span> <input type="text" value={invoiceAmount} readOnly className="w-32 border border-gray-400 bg-gray-100 px-1 font-semibold text-right"/></div>
                    <div className="flex justify-between items-center"><span className="text-right flex-1 mr-2">Advance Amt:</span> <input type="number" min="0" value={advancePaymentAmount} onChange={e=>setAdvancePaymentAmount(e.target.value)} className="w-32 border border-gray-400 bg-white px-1 text-right"/></div>
                  </div>
                  
                  <div className="flex flex-col ml-4 mr-4 w-32 justify-end mb-1">
                    <div className="text-center font-bold mb-1">Bal Amount</div>
                    <input type="text" value={balanceAmount} readOnly className="w-full border border-gray-400 bg-gray-100 px-1 py-1 h-6 text-right font-bold text-red-600"/>
                  </div>"""

content = content.replace(old_ui_amounts, new_ui_amounts)

with open('src/app/sales/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
