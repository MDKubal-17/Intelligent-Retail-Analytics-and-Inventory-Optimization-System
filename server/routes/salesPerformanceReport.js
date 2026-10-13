import express from "express";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import { parse } from "csv-parse/sync";

const router = express.Router();

const SALES_API =
  process.env.FLASK_SALES_URL ||
  "http://127.0.0.1:5000/api/sales";

const numberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/,/g, "").replace(/[₹$]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

const firstValue = (row, names) => {
  const keys = Object.keys(row || {});
  const match = names.find((name) =>
    keys.some((key) => key.trim().toLowerCase() === name.toLowerCase())
  );
  if (!match) return undefined;
  const actualKey = keys.find((key) => key.trim().toLowerCase() === match.toLowerCase());
  return row[actualKey];
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const dateLabel = (value) => {
  if (!value) return "Undated";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

async function fetchSalesRows() {
  const response = await fetch(SALES_API, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Sales API returned HTTP ${response.status}`);

  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json") || /^[\s]*[\[{]/.test(body)) {
    const parsed = JSON.parse(body);
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed.data && Array.isArray(parsed.data)
        ? parsed.data
        : parsed.sales && Array.isArray(parsed.sales)
          ? parsed.sales
          : parsed.records && Array.isArray(parsed.records)
            ? parsed.records
            : null;
    if (!rows) throw new Error("Sales API JSON must be an array or contain data[], sales[], or records[].");
    return rows;
  }

  return parse(body, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  });
}

function normalizeSales(rows) {
  return rows.map((row) => {
    const date = firstValue(row, ["date", "timestamp", "created_at", "order_date"]);
    const productId = firstValue(row, ["product_id", "productId", "sku"]);
    const product = firstValue(row, ["product", "product_name", "productName", "name"]) || productId || "Unspecified product";
    const category = firstValue(row, ["category", "product_category"]) || "Uncategorized";
    const quantity = numberOrNull(firstValue(row, ["quantity", "qty", "units_sold"])) ?? 0;
    const unitPrice = numberOrNull(firstValue(row, ["unit_price", "unitPrice", "price"])) ?? 0;
    const discountPercent = numberOrNull(firstValue(row, ["discount_percent", "discountPercent", "discount"])) ?? 0;
    const netRevenue = numberOrNull(firstValue(row, ["revenue", "net_revenue", "netRevenue"]));
    const transactionId = firstValue(row, ["transaction_id", "transactionId", "order_id", "orderId"]);
    const grossRevenue = quantity * unitPrice;
    // The project’s `revenue` field is defined as net of discounts.
    // Use the recorded net revenue where present; otherwise derive net from gross and discount%.
    const net = netRevenue !== null
      ? netRevenue
      : grossRevenue * (1 - Math.max(0, Math.min(100, discountPercent)) / 100);
    const discountAmount = Math.max(0, grossRevenue - net);
    return {
      date: date || null,
      productId: productId == null ? "" : String(productId),
      product: String(product),
      category: String(category),
      quantity,
      unitPrice,
      discountPercent,
      grossRevenue,
      discountAmount,
      netRevenue: net,
      transactionId: transactionId == null ? "" : String(transactionId),
    };
  }).filter((row) =>
    row.quantity !== 0 ||
    row.grossRevenue !== 0 ||
    row.netRevenue !== 0 ||
    row.transactionId
  );
}

function aggregate(rows) {
  const grossRevenue = rows.reduce((s, r) => s + r.grossRevenue, 0);
  const netRevenue = rows.reduce((s, r) => s + r.netRevenue, 0);
  const discounts = rows.reduce((s, r) => s + r.discountAmount, 0);
  const quantity = rows.reduce((s, r) => s + r.quantity, 0);
  const uniqueTransactions = new Set(
    rows.map((r) => r.transactionId || `${r.date || "undated"}|${r.productId}|${r.netRevenue}`)
  );
  const products = new Map();
  const months = new Map();
  const categories = new Map();

  for (const r of rows) {
    const productKey = `${r.productId}|${r.product}`;
    const p = products.get(productKey) || { productId: r.productId, product: r.product, category: r.category, units: 0, gross: 0, discounts: 0, net: 0 };
    p.units += r.quantity; p.gross += r.grossRevenue; p.discounts += r.discountAmount; p.net += r.netRevenue;
    products.set(productKey, p);

    const c = categories.get(r.category) || { category: r.category, units: 0, net: 0 };
    c.units += r.quantity; c.net += r.netRevenue; categories.set(r.category, c);

    const d = r.date ? new Date(r.date) : null;
    const monthKey = d && !Number.isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : "Undated";
    const m = months.get(monthKey) || { month: monthKey, orders: new Set(), gross: 0, net: 0, discounts: 0 };
    m.orders.add(r.transactionId || `${r.date || "undated"}|${r.productId}|${r.netRevenue}`);
    m.gross += r.grossRevenue; m.net += r.netRevenue; m.discounts += r.discountAmount;
    months.set(monthKey, m);
  }

  return {
    rowCount: rows.length,
    orderCount: uniqueTransactions.size,
    unitsSold: quantity,
    grossRevenue,
    totalDiscounts: discounts,
    netRevenue,
    averageOrderValue: uniqueTransactions.size ? netRevenue / uniqueTransactions.size : 0,
    discountRate: grossRevenue > 0 ? discounts / grossRevenue * 100 : 0,
    products: [...products.values()].sort((a, b) => b.net - a.net),
    categories: [...categories.values()].sort((a, b) => b.net - a.net),
    months: [...months.values()].map((m) => ({ ...m, orders: m.orders.size })).sort((a, b) => a.month.localeCompare(b.month)),
    dateRange: {
      start: rows.map((r) => r.date).filter(Boolean).sort()[0] || null,
      end: rows.map((r) => r.date).filter(Boolean).sort().at(-1) || null,
    },
  };
}

function drawHeader(doc, reportId, issuedAt) {
  doc.rect(0, 0, doc.page.width, 78).fill("#12345A");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(17).text("INTELLIGENT RETAIL ANALYTICS SYSTEM", 42, 22);
  doc.font("Helvetica").fontSize(9).fillColor("#DCE8F6").text("Data-driven decisions  |  Retail performance  |  Audit-ready reporting", 42, 48);
  doc.fillColor("#173B63").font("Helvetica-Bold").fontSize(22).text("RETAIL SALES & REVENUE REPORT", 42, 98, { width: 510 });
  doc.fillColor("#49627E").font("Helvetica").fontSize(10).text("Commercial sales and order revenue analytics", 42, 128);
  doc.roundedRect(390, 94, 165, 59, 7).lineWidth(0.8).strokeColor("#BDD2E8").stroke();
  doc.fillColor("#173B63").font("Helvetica-Bold").fontSize(8).text("REPORT REFERENCE", 402, 104);
  doc.font("Helvetica").fontSize(8).text(reportId, 402, 117, { width: 145 });
  doc.fillColor("#49627E").text(`Issued: ${issuedAt}`, 402, 134, { width: 145 });
}

function sectionTitle(doc, text, y) {
  doc.fillColor("#173B63").font("Helvetica-Bold").fontSize(12).text(text, 42, y);
  doc.moveTo(42, y + 17).lineTo(553, y + 17).lineWidth(0.7).strokeColor("#D5E2EF").stroke();
}

function drawTable(doc, x, y, widths, headers, rows, rowHeight = 20) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  doc.rect(x, y, totalWidth, 22).fill("#EAF2FA");
  let xx = x;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173B63");
  headers.forEach((h, i) => { doc.text(h, xx + 6, y + 7, { width: widths[i] - 12, ellipsis: true }); xx += widths[i]; });
  let yy = y + 22;
  rows.forEach((row, ri) => {
    // Reserve the bottom band for the footer and prevent table content from triggering implicit pages.
    if (yy + rowHeight > 785) return;
    if (ri % 2 === 0) doc.rect(x, yy, totalWidth, rowHeight).fill("#FBFDFF");
    doc.moveTo(x, yy + rowHeight).lineTo(x + totalWidth, yy + rowHeight).strokeColor("#E1EAF3").lineWidth(0.4).stroke();
    let cx = x;
    doc.font("Helvetica").fontSize(7.5).fillColor("#263F5A");
    row.forEach((cell, i) => { doc.text(String(cell), cx + 6, yy + 6, { width: widths[i] - 12, ellipsis: true }); cx += widths[i]; });
    yy += rowHeight;
  });
  doc.rect(x, y, totalWidth, yy - y).strokeColor("#D5E2EF").lineWidth(0.6).stroke();
  return yy;
}

router.get("/sales-performance.pdf", async (req, res) => {
  try {
    const rawRows = await fetchSalesRows();
    const rows = normalizeSales(rawRows);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No usable sales records were returned by the configured Flask sales API. No report was generated.",
        source: SALES_API,
      });
    }

    const totals = aggregate(rows);
    const issued = new Date();
    const reportId = `SALES-${issued.toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const issuedLabel = issued.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    const reportPayload = {
      reportId,
      source: SALES_API,
      generatedAt: issued.toISOString(),
      dateRange: totals.dateRange,
      totals: {
        rowCount: totals.rowCount,
        orderCount: totals.orderCount,
        unitsSold: totals.unitsSold,
        grossRevenue: Number(totals.grossRevenue.toFixed(2)),
        totalDiscounts: Number(totals.totalDiscounts.toFixed(2)),
        netRevenue: Number(totals.netRevenue.toFixed(2)),
        averageOrderValue: Number(totals.averageOrderValue.toFixed(2)),
      },
      products: totals.products,
      categories: totals.categories,
      months: totals.months.map(({ orders, month, gross, net, discounts }) => ({ month, orders, gross, net, discounts })),
    };
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify(reportPayload)).digest("hex");

    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="retail-sales-report-${issued.toISOString().slice(0, 10)}.pdf"`);
    res.setHeader("Cache-Control", "no-store");

    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: "Retail Sales & Revenue Report", Author: "Intelligent Retail Analytics System", Subject: "Sales performance analytics" } });
    doc.on("error", (error) => {
      console.error("Sales report PDF stream error:", error);
      if (!res.headersSent) res.status(500).end("Failed to generate report PDF.");
      else res.end();
    });
    doc.pipe(res);

    drawHeader(doc, reportId, issuedLabel);

    doc.fillColor("#49627E").font("Helvetica").fontSize(8.5).text(
      `Data period: ${dateLabel(totals.dateRange.start)} to ${dateLabel(totals.dateRange.end)}   |   Source records: ${totals.rowCount}`,
      42, 166, { width: 511 }
    );

    sectionTitle(doc, "1. SALES PERFORMANCE OVERVIEW", 191);
    const overviewRows = [
      ["Source records included", totals.rowCount.toLocaleString("en-IN")],
      ["Orders processed", totals.orderCount.toLocaleString("en-IN")],
      ["Units sold", totals.unitsSold.toLocaleString("en-IN")],
      ["Gross revenue", money(totals.grossRevenue)],
      ["Total discounts", money(totals.totalDiscounts)],
      ["Net revenue", money(totals.netRevenue)],
      ["Average order value", money(totals.averageOrderValue)],
    ];
    drawTable(doc, 42, 216, [255, 256], ["Description", "Recorded value"], overviewRows, 18);

    sectionTitle(doc, "2. REVENUE & ORDER LEDGER", 382);
    const monthlyRows = totals.months.slice(-8).map((m) => [
      m.month,
      m.orders.toLocaleString("en-IN"),
      money(m.gross),
      money(m.discounts),
      money(m.net),
    ]);
    if (monthlyRows.length) {
      drawTable(doc, 42, 407, [72, 66, 116, 116, 116], ["Period", "Orders", "Gross revenue", "Discounts", "Net revenue"], monthlyRows, 16);
    } else {
      doc.fillColor("#627A94").font("Helvetica").fontSize(9).text("No dated monthly breakdown is available. Overall totals above are based on usable sales rows.", 42, 415);
    }

    const afterMonthly = 429 + Math.max(1, monthlyRows.length) * 16;
    const productY = Math.min(560, Math.max(470, afterMonthly + 8));
    sectionTitle(doc, "3. TOP PERFORMING PRODUCTS", productY);
    const productRows = totals.products.slice(0, 5).map((p, i) => [
      String(i + 1),
      p.product,
      p.category,
      p.units.toLocaleString("en-IN"),
      money(p.net),
    ]);
    drawTable(doc, 42, productY + 24, [28, 190, 105, 65, 98], ["#", "Product", "Category", "Units", "Net revenue"], productRows, 16);

    // Start a clean integrity page if the data tables use most of page one.
    doc.addPage();
    drawHeader(doc, reportId, issuedLabel);
    sectionTitle(doc, "5. REPORT NOTES & DATA DEFINITIONS", 178);
    const notes = [
      "Net revenue: uses the source system's `revenue` field, treated as revenue after discounts as configured for this report.",
      "Gross revenue: calculated from quantity × unit price for each sales row.",
      "Discount amount: calculated as the positive difference between gross revenue and recorded net revenue. This is an estimate when source rows contain inconsistent values.",
      "Order count: distinct transaction/order IDs where available; rows without IDs use a fallback composite key.",
      "No sales figures, growth rates, or comparisons to prior periods are fabricated. This report shows only values supported by the returned source records.",
    ];
    let ny = 207;
    notes.forEach((note, i) => {
      doc.circle(49, ny + 5, 2.3).fill("#2A73B8");
      doc.fillColor("#314A64").font("Helvetica").fontSize(8).text(note, 60, ny, { width: 480, lineGap: 2 });
      ny += 35;
    });

    sectionTitle(doc, "4. CATEGORY PERFORMANCE", 398);
    const categoryRows = totals.categories.slice(0, 6).map((c) => [
      c.category,
      c.units.toLocaleString("en-IN"),
      money(c.net),
      totals.netRevenue ? `${(c.net / totals.netRevenue * 100).toFixed(1)}%` : "N/A",
    ]);
    drawTable(doc, 42, 422, [220, 80, 115, 71], ["Category", "Units sold", "Net revenue", "Revenue share"], categoryRows, 17);

    sectionTitle(doc, "5. DATA INTEGRITY FINGERPRINT", 560);
    doc.roundedRect(42, 461, 511, 80, 8).fillAndStroke("#F3F8FD", "#C8DCEE");
    doc.fillColor("#173B63").font("Helvetica-Bold").fontSize(9).text("SHA-256 REPORT FINGERPRINT", 56, 475);
    doc.fillColor("#304B68").font("Courier").fontSize(7.4).text(fingerprint, 56, 494, { width: 480, lineGap: 3 });
    doc.fillColor("#627A94").font("Helvetica").fontSize(7.5).text("Fingerprint is calculated from the generated report data payload. It is not a claim of government approval or external blockchain verification.", 56, 520, { width: 480 });

    sectionTitle(doc, "6. REPORT METADATA", 656);
    drawTable(doc, 42, 680, [125, 386], [
      "Field", "Value"
    ], [
      ["Report reference", reportId],
      ["Generated at", `${issued.toISOString()} (UTC; displayed issue time in Asia/Kolkata)`],
      ["Data source", SALES_API],
      ["Rows included", String(totals.rowCount)],
      ["Integrity algorithm", "SHA-256"],
    ], 19);

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, 805, doc.page.width, 37).fill("#12345A");
      doc.fillColor("#FFFFFF").font("Helvetica").fontSize(8).text(`Report: ${reportId}`, 42, 819);
      doc.text("Intelligent Retail Analytics System  •  Generated from source sales records", 205, 819, { width: 270, align: "center" });
      doc.text(`Page ${i + 1} of ${range.count}`, 485, 819, { width: 68, align: "right" });
    }

    doc.end();
  } catch (error) {
    console.error("Sales performance PDF generation failed:", error);
    if (!res.headersSent) {
      const isUpstream = /Sales API returned|fetch failed|ECONNREFUSED|TimeoutError|Sales API JSON/.test(error.message || "");
      res.status(isUpstream ? 502 : 500).json({
        success: false,
        message: isUpstream
          ? "Unable to read valid sales data from the configured Flask sales API."
          : "Failed to generate the sales performance PDF.",
        detail: error.message,
      });
    } else {
      res.end();
    }
  }
});

export default router;
