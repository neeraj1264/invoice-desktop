// src/Utils/whatsapp.js
export function digitsOnly(s = "") {
  return String(s).replace(/\D/g, "");
}

export function openWhatsApp(phone = "", text = "") {
  const msg = encodeURIComponent(text || "");
  const digits = digitsOnly(phone);

  if (digits.length === 0) {
    // No phone: open WhatsApp Web / Web API with message
    const url = `https://web.whatsapp.com/send?text=${msg}`;
    window.open(url, "_blank");
    return;
  }

  // if 10 digits -> assume Indian mobile, prefix 91
  let target = digits;
  if (digits.length === 10) target = `91${digits}`;

  // wa.me expects digits only (no +). Use wa.me so mobile devices open app directly
  const url = `https://wa.me/${target}?text=${msg}`;
  window.open(url, "_blank");
}

/**
 * Build a plain-text order invoice message from an order object.
 * Accepts either: { products } or { items } with fields: name, size, price, quantity
 */
export function formatOrderMessage({
  billNumber,
  orderNumber,
  orderType,
  name,
  phone,
  address,
  products = [],
  items = [],
  delivery = 0,
  discount = 0,
} = {}) {
  const list = products.length ? products : items;
  const lines = [];

  lines.push(` -------Urban Pizzeria-------   `);
  lines.push(`Bill-No: ${billNumber || "-"}`);
  lines.push(`Order-No: ${orderNumber ? `RT-${orderNumber}` : "-"}`);
  if (orderType) lines.push(`Order-Type: ${orderType}`);
  if (name) lines.push(`Name: ${name}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (address) lines.push(`Address: ${address}`);
  lines.push("");
  lines.push("---------- ITEMS ----------");

  let itemTotal = 0;
  list.forEach((p, i) => {
    const qty = p.quantity || 1;
    const size = p.size ? ` (${p.size})` : "";
    const total = (p.price || 0) * qty;
    itemTotal += total;
    lines.push(`${i + 1}. ${p.name}${size} x ${qty}  = ₹${total.toFixed(2)}`);
  });

  lines.push("");
//   lines.push(`Item Total: ₹${itemTotal.toFixed(2)}`);
  if (delivery && parseFloat(delivery) > 0) {
    lines.push(`Service Charge: +₹${parseFloat(delivery).toFixed(2)}`);
  }

  // discount can be number (amount) or object; handle as amount for now
  if (discount && parseFloat(discount) > 0) {
    lines.push(`Discount: -₹${parseFloat(discount).toFixed(2)}`);
  }

  const net = itemTotal + (parseFloat(delivery) || 0) - (parseFloat(discount) || 0);
  lines.push(`Net Total: ₹${net.toFixed(2)}`);
  lines.push("");
  lines.push("Thank you — Visit Again!");

  return lines.join("\n");
}
