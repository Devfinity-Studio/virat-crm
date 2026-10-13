"use client";

import { api } from "@/trpc/react";
import { format } from "date-fns";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if ((num = num || 0) < 0) return "Minus " + numberToWords(Math.abs(num));

  const n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    Number(n[1]) != 0
      ? (a[Number(n[1])] || b[Number(n[1]![0])] + " " + a[Number(n[1]![1])]) +
        "Crore "
      : "";
  str +=
    Number(n[2]) != 0
      ? (a[Number(n[2])] || b[Number(n[2]![0])] + " " + a[Number(n[2]![1])]) +
        "Lakh "
      : "";
  str +=
    Number(n[3]) != 0
      ? (a[Number(n[3])] || b[Number(n[3]![0])] + " " + a[Number(n[3]![1])]) +
        "Thousand "
      : "";
  str +=
    Number(n[4]) != 0
      ? (a[Number(n[4])] || b[Number(n[4]![0])] + " " + a[Number(n[4]![1])]) +
        "Hundred "
      : "";
  str +=
    Number(n[5]) != 0
      ? (str != "" ? "and " : "") +
        (a[Number(n[5])] || b[Number(n[5]![0])] + " " + a[Number(n[5]![1])])
      : "";

  return str.trim() + " Rupees Only";
}

export default function SalePrintLayout() {
  const params = useParams();
  const saleId = parseInt(params.id as string);

  const { data: sale, isLoading } = api.sales.getSale.useQuery(
    { id: saleId },
    { enabled: !!saleId },
  );

  useEffect(() => {
    if (sale) {
      // Small delay to ensure images load before opening print dialog
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [sale]);

  if (isLoading || !sale) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const grandTotalQty = sale.totalQty;
  const grandTotalAmount = sale.invoiceAmount;
  const discount = sale.tradeDiscount || "0";
  const basicValue = sale.basicInvoiceValue || grandTotalAmount;
  const cgst = sale.cgst || "0";
  const sgst = sale.sgst || "0";
  const igst = sale.igst || "0";

  const finalTotalAmount = parseFloat(grandTotalAmount);
  const amountInWords = numberToWords(Math.round(finalTotalAmount));

  return (
    <div className="min-h-screen bg-gray-100 text-black p-2 sm:p-8 font-sans">
      <div className="w-full overflow-x-auto print:overflow-visible">
        <div className="mx-auto max-w-4xl min-w-[800px] print:min-w-0 print:w-full bg-white shadow-md print:shadow-none mb-8">
          <div className="border-2 border-black p-6 sm:p-8 m-2 sm:m-0 print:m-0 print:border-0">
          {/* Header */}
          <div className="text-center font-bold text-xl uppercase mb-4 tracking-widest border-b-2 border-black pb-2">
            Tax Invoice
          </div>

          <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
            <div className="space-y-1">
              <h2 className="font-bold text-lg">VIRAT BIO PLAANTEC PVT LTD.</h2>
              <p className="text-sm">
                Sahityaicon, Shop no - 213, Nr. Capital Corporate,
                <br />
                Naroda, Ahmedabad - 382330, Gujarat
              </p>
              <div className="flex gap-8 text-sm font-bold pt-2">
                <p>GSTIN NO: 24AAJCV4771F1Z6</p>
                <p>State: GUJARAT</p>
              </div>
            </div>
            <div className="w-32 h-32 relative flex-shrink-0">
              <Image
                src="/logo-removebg-preview.png"
                alt="Virat Bio Plaantec Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-2 border-r-2 border-black pr-4">
              <h3 className="font-bold border-b border-black pb-1 mb-2">Details of Receiver</h3>
              <p className="text-sm"><span className="font-semibold">Name:</span> {sale.customerName}</p>
              <p className="text-sm"><span className="font-semibold">Contact No:</span> {(sale as any).customer?.mobile || "-"}</p>
              <p className="text-sm"><span className="font-semibold">Address:</span> {sale.customerAddress}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><span className="font-semibold">INVOICE NO:</span> {sale.orderNumber}</p>
              <p className="text-sm"><span className="font-semibold">DATE:</span> {format(new Date(sale.invoiceDate), "dd-MM-yyyy")}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm border-collapse border-2 border-black mb-4">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th className="border-r border-black p-2 text-center">Sr No</th>
                <th className="border-r border-black p-2 text-left">Particulars</th>
                <th className="border-r border-black p-2 text-left">Category</th>
                <th className="border-r border-black p-2 text-left">HSN Code</th>
                <th className="border-r border-black p-2 text-right">Qty (PLANT)</th>
                <th className="border-r border-black p-2 text-right">Rate</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="border-r border-black p-2 text-center">{index + 1}</td>
                  <td className="border-r border-black p-2">
                    {item.product.name} {item.isFree ? <span className="font-semibold text-gray-600">(Free)</span> : ""}
                  </td>
                  <td className="border-r border-black p-2">{(item.product as any).category || "-"}</td>
                  <td className="border-r border-black p-2">{(item.product as any).hsnCode || "-"}</td>
                  <td className="border-r border-black p-2 text-right">{item.quantity}</td>
                  <td className="border-r border-black p-2 text-right">{item.isFree ? "0.00" : (item.rate || item.product.price)}</td>
                  <td className="p-2 text-right">{item.isFree ? "0.00" : (item.totalAmount || (parseFloat(item.product.price) * item.quantity).toFixed(2))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold bg-gray-50">
                <td colSpan={4} className="border-r border-black p-2 text-right">GRAND TOTAL</td>
                <td className="border-r border-black p-2 text-right">{grandTotalQty} PLANT</td>
                <td className="border-r border-black p-2"></td>
                <td className="p-2 text-right">{grandTotalAmount}</td>
              </tr>
            </tfoot>
          </table>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2">
              <table className="w-full text-sm font-semibold">
                <tbody>
                  <tr>
                    <td className="py-1">Less: Trade Discount</td>
                    <td className="py-1 text-right">{discount}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Basic Invoice Value</td>
                    <td className="py-1 text-right">{basicValue}</td>
                  </tr>
                  <tr>
                    <td className="py-1">CGST</td>
                    <td className="py-1 text-right">{cgst}</td>
                  </tr>
                  <tr>
                    <td className="py-1">SGST</td>
                    <td className="py-1 text-right">{sgst}</td>
                  </tr>
                  <tr>
                    <td className="py-1 border-b border-black">IGST</td>
                    <td className="py-1 text-right border-b border-black">{igst}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-end mt-12 pt-8">
            <div className="text-sm font-semibold w-2/3">
              Total Invoice Amount (In Words):<br />
              <span className="font-bold underline uppercase">{amountInWords}</span>
            </div>
            <div className="text-sm font-semibold text-right border-t border-black pt-2 w-48">
              Authorized Signature
            </div>
          </div>
        </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }
          /* Hide standard layout headers/sidebars when printing */
          header, nav, aside { display: none !important; }
        }
      `}} />
    </div>
  );
}
