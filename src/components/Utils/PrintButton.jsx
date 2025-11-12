import React from "react";

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

function buildMobileInvoiceHtml(order = {}) {
  const products = Array.isArray(order.products) ? order.products : [];

  const rows = products
    .map((product, index) => {
      const qty = product.quantity || 1;
      const name = product.size ? `${product.name} (${product.size})` : product.name;
      const price = Number(product.price || 0);
      const total = price * qty;
      return `
        <tr class="productdetail">
          <td style="font-size:15px">${escapeHtml(name)}</td>
          <td style="text-align:center;font-size:15px">${qty}</td>
          <td style="text-align:center;font-size:15px">₹${price}</td>
          <td style="text-align:center;font-size:15px">₹${total}</td>
        </tr>
      `;
    })
    .join("\n");

  const itemTotal = products.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0);
  const delivery = Number(order.delivery || 0) || 0;
  const otherCharges = Number(order.otherCharges || 0) || 0;
  const pendingAmount = Number(order.pendingAmount || 0) || 0;
  const disposalCharges = Number(order.disposalCharges || 0) || 0;
  const discount = Number(order.discount || 0) || 0; // assume absolute amount
  const netTotal = itemTotal + disposalCharges + otherCharges + delivery - discount;

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>KOT</title>
      <style>
       @page { size: 60mm auto; margin: 0; }
        body { font-family: Arial, sans-serif; font-size:12px; width:60mm; margin:0; padding:0 }
        table { width:95%; border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 2px; text-align: left; font-size:11px; color: #000 }
        .total { font-size:13px; text-align:left; margin-top:4px; display:flex; align-items:baseline; justify-content:space-between }
        .totalAmount { font-size:15px; font-weight:800; border:2px dashed; text-align:center; background:black; color:white; padding:0.4rem }
            .logo { display: flex; justify-content: center; margin: 3px auto; }
            .logo img { width: 50px; height: auto; }
        hr { border:2px dashed }
        h1 { text-align:center; margin:.5rem; font-size:25px }
        .customer-info p { font-size:16px; margin:0 }
        .customer-info p + p { margin-top: 2px }
        h2 { text-align:center; margin:0; font-size:20px }
      </style>
    </head>
    <body>
      <div >
        <div>
          <img class="logo" src="/logo.png" alt="Logo" width="150" onerror="this.style.display='none'" />
        </div>
        <h1>Urban Pizzeria</h1>
        <p style="text-align:center; margin-top:0; font-size:20px; padding:0 2px;">Lal Dawara Mandir Wali Gali, Near Body Fine Gym Ambala Road Pehowa.<br/>81689-01827</p>
        <hr />
        <h2>Invoice Details</h2>

        <div class="customer-info" style="margin-top:6px;">
          <p>Order No:&nbsp;&nbsp;<span style="font-weight:bold">RT_${escapeHtml(order.orderNumber || "")}</span></p>
          <p>Bill No:&nbsp;&nbsp;<span style="font-weight:bold">#${escapeHtml(order.billNumber || "")}</span></p>
          <p>OrderType&nbsp;:&nbsp;&nbsp;<span style="font-weight:bold">${escapeHtml(order.orderType || "")}</span></p>
          <p>Date:&nbsp;${escapeHtml(formatDateTime(order.timestamp))}</p>
          ${order.name ? `<p>Customer:&nbsp;<span style="font-weight:bold">${escapeHtml(order.name)}</span></p>` : ""}
          ${order.phone ? `<p>Phone:&nbsp;&nbsp;<span style="font-weight:bold">${escapeHtml(order.phone)}</span></p>` : ""}
          ${order.address ? `<p style=\"margin:0 0 1rem 0\">Address&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml(order.address)}</p>` : ""}
        </div>

        <table>
          <thead>
            <tr style="background:darkgrey">
              <th style="font-size:16px">Item</th>
              <th style="font-size:16px">Qty</th>
              <th style="font-size:16px">Price</th>
              <th style="font-size:16px">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${delivery !== 0 ? `
          <div class="total">
            <p style="margin:1rem 0 0 0">Item Total </p>
            <p style="margin:0">₹${itemTotal.toFixed(2)}</p>
          </div>
          <div class="total">
            <p style="margin:0">Service Charge:</p>
            <p style="margin:0">+${delivery.toFixed(2)}</p>
          </div>
        ` : ""}

        ${otherCharges !== 0 ? `
          <div class="total">
            <p style="margin:1rem 0 0 0">Item Total </p>
            <p style="margin:0">₹${itemTotal.toFixed(2)}</p>
          </div>
          <div class="total">
            <p style="margin:0">Other Charges:</p>
            <p style="margin:0">+${otherCharges.toFixed(2)}</p>
          </div>
        ` : ""}

        ${disposalCharges !== 0 ? `
          <div class="total">
            <p style="margin:1rem 0 0 0">Item Total </p>
            <p style="margin:0">₹${itemTotal.toFixed(2)}</p>
          </div>
          <div class="total">
            <p style="margin:0">Disposal Charges:</p>
            <p style="margin:0">+${disposalCharges.toFixed(2)}</p>
          </div>
        ` : ""}

        ${(discount > 0) ? `
          <div class="total">
            <p style="margin:0">Discount:</p>
            <p style="margin:0">–${discount.toFixed(2)}</p>
          </div>
        ` : ""}

        <p class="totalAmount">Net Total: ₹${netTotal.toFixed(2)}</p>
        ${(pendingAmount > 0) ? `
        <p style="text-align: center">pending Amount: ${pendingAmount}</p>
        `: ""}
        <hr />
        <div style="text-align:center; font-size:15px; padding:.1rem 0 1rem; margin: .5rem">Thank You Visit Again!</div>
        <div style="text-align:center; font-size:15px; padding:.1rem 0 1rem; margin: .5rem; color: grey">Powered By Billzo || 7015823645</div>
        <hr/>
        </div>
    </body>
  </html>`;

  return html;
}

function printHtml(html) {
  const newWindow = window.open("", "", "width=600,height=400");
  if (!newWindow) {
    console.error("Popup blocked or failed to open.");
    return;
  }
  newWindow.document.write(html);
  newWindow.document.close();
  newWindow.onload = () => {
    newWindow.focus();
    newWindow.print();
    newWindow.close();
  };
}

export default function PrintButton({ order = null, elementId = null, getHtml = null, label = "Print", className = "" }) {
  const handleClick = async () => {
    try {
      // 1) elementId: use existing DOM content (keeps your mobileinvoice markup exactly)
      if (elementId) {
        const el = document.getElementById(elementId);
        if (!el) {
          console.error(`No element found with id=\"${elementId}\"`);
          return;
        }
        const kotContent = el.innerHTML;
        const html = `<!doctype html><html><head><meta charset=\"utf-8\" /><title>KOT</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; width: 60mm;  }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 2px; text-align: left; font-size: 11px; color: #000 }
            .total { font-size: 13px; text-align: left; margin-top: 4px; display: flex; align-items: baseline; justify-content: space-between }
            .totalAmount { font-size: 15px; font-weight: 800; border: 2px dashed; text-align: center; background: black; color: white; padding: 0.4rem }
            .logo { display: flex; justify-content: center; margin: 3px auto; }
            .logo img { width: 50px; height: auto; }
            hr { border: 2px dashed; }
          </style>
        </head><body>${kotContent}</body></html>`;
        printHtml(html);
        return;
      }

      // 2) custom getHtml callback
      if (typeof getHtml === "function") {
        const html = await getHtml(order);
        if (!html) {
          console.error("getHtml did not return HTML string");
          return;
        }
        printHtml(html);
        return;
      }

      // 3) order-based builder (replicates mobileinvoice layout)
      if (order) {
        const html = buildMobileInvoiceHtml(order);
        printHtml(html);
        return;
      }

      console.error("PrintButton: no elementId, getHtml or order supplied");
    } catch (err) {
      console.error("Error generating printable content:", err);
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
