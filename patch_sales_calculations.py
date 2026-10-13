import re

with open('src/app/sales/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix updateSaleItem
old_update_sale_item = """  const updateSaleItem = (id: number, field: string, value: string) => {
    setSaleItems(saleItems.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };"""

new_update_sale_item = """  const updateSaleItem = (id: number, field: string, value: string) => {
    setSaleItems(saleItems.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      
      // Auto-populate from product if productId changes
      if (field === "productId") {
        const prod = products.find(p => p.id === parseInt(value, 10));
        if (prod) {
          updated.rate = prod.mrp?.toString() || "0";
          updated.ptsPerQty = prod.points?.toString() || "0";
        }
      }
      
      const qty = parseFloat(updated.quantity) || 0;
      const rate = parseFloat(updated.rate) || 0;
      const pts = parseFloat(updated.ptsPerQty) || 0;
      
      if (field === "quantity" || field === "rate" || field === "productId") {
        updated.amount = (qty * rate).toFixed(2);
      }
      if (field === "quantity" || field === "ptsPerQty" || field === "productId") {
        updated.totalPts = (qty * pts).toFixed(2);
      }
      
      return updated;
    }));
  };"""

content = content.replace(old_update_sale_item, new_update_sale_item)

# Add useEffect to sum invoiceAmount
# We need to insert this after `const [invoiceAmount, setInvoiceAmount] = useState("");`
old_invoice = """  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState("");"""

new_invoice = """  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState("");
  
  useEffect(() => {
    const total = saleItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    setInvoiceAmount(total > 0 ? total.toFixed(2) : "");
  }, [saleItems]);"""

content = content.replace(old_invoice, new_invoice)

with open('src/app/sales/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
