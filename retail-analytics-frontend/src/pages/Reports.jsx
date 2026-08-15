import React, { useState, useEffect, useRef } from "react";

// -----------------------------------------------------------------------------
// 1. CONFIGURATION & CONSTANTS
// -----------------------------------------------------------------------------

const CONFIG = {
  API_ENDPOINTS: [
    import.meta.env.VITE_REPORTS_API_URL,
    "https://retail-backend-9qvb.onrender.com/api/reports/government-audit",
    "http://localhost:5000/api/reports/government-audit"
  ].filter(Boolean),
  DEFAULT_TAB: "sales",
  TIMEZONE: "IST (UTC+05:30)",
  DATE_FORMAT_LOCALE: "en-GB"
};

const UI_TEXT = {
  LOADING_TITLE: "Fetching Live Data...",
  LOADING_SUBTITLE: "Retrieving records from database endpoints.",
  ERROR_TITLE: "Data Retrieval Error",
  ERROR_DEFAULT: "No report data found.",
  ERROR_NETWORK: "Failed to load report data from the server. Please check your network or backend service.",
  RETRY_BTN: "Retry Connection",
  HEADER_TITLE: "Analytics & Compliance Report Center",
  LIVE_STATUS: "● Live Database Connected",
  PRINT_BTN: "Download / Print Clean Report",
  TAB_SALES: "📈 Sales Performance Report",
  TAB_GOVT: "🏛️ Government Audit & Tax Report",
  TITLE_SALES: "RETAIL SALES & REVENUE REPORT",
  TITLE_GOVT: "OFFICIAL COMPLIANCE REPORT",
  SUBHEADER_TAG: "Confidential & Authorized Record • Intelligent Retail Analytics System",
  DEFAULT_VAL: "N/A",
  REF_NO: "Ref No:",
  DATE_ISSUE: "Date of Issue:",
  SUBJECT: "Subject:",
  SYS_SOURCE: "System Source:",
  SUBJECT_SALES: "Commercial Sales & Order Revenue Analytics",
  SEC_1_SALES_TITLE: "1. Sales Performance Overview",
  SEC_1_SALES_BODY: "This section provides detailed breakdowns of sales operations, order volume, promotional discounts, and net commercial revenue recorded across active inventory cycles.",
  SEC_2_SALES_TITLE: "2. Revenue & Order Ledger",
  SEC_1_GOVT_TITLE: "1. Statutory Compliance & Audit Summary",
  SEC_1_GOVT_BODY: "This report contains verified inventory audit parameters and regulatory tax ledgers formatted for official inspection.",
  SEC_2_GOVT_TITLE: "2. System Audit Metrics",
  SEC_3_GOVT_TITLE: "3. Statutory Tax Breakdown",
  NO_SALES_DATA: "No sales records found in database.",
  NO_METRICS_DATA: "No metrics recorded in database.",
  NO_TAX_DATA: "No statutory tax entries recorded.",
  DECLARATION_LABEL: "Statutory Declaration:",
  DECLARATION_TEXT: "Information rendered within this statement is retrieved directly from system database ledgers. Unverified modification or falsification of this electronic record is subject to regulatory penalties under applicable data integrity acts.",
  SIG_SYSTEM: "Automated System Verification",
  SIG_SYSTEM_SUB: "Cryptographic Lead Analyst Seal",
  STAMP_ARC: "OFFICIALLY VERIFIED",
  STAMP_MAIN: "AUTHENTIC",
  STAMP_SUB: "RETAIL ANALYTICS",
  SIG_NODAL: "Authorized Nodal Officer",
  SIG_NODAL_SUB: "Signature & Official Stamp",
  REF_LABEL: "Report Ref:",
  GEN_LABEL: "Generated On:",
  PAGE_LABEL: "Page",
  OF_LABEL: "of",
  BACK_BTN: "← Back",
  SYS_ONLINE: "System Online",
  REFRESH_BTN: "↻ Refresh Session"
};

const TABLE_HEADERS = {
  SALES: ["Financial Period", "Orders Processed", "Gross Revenue", "Total Discounts", "Net Revenue"],
  METRICS: ["Parameter", "Compliance Status", "Recorded Rate"],
  TAX: ["HSN Code", "Category", "Taxable Amount", "CGST", "SGST", "Total Tax"]
};

// -----------------------------------------------------------------------------
// 2. STYLESHEET OBJECT
// -----------------------------------------------------------------------------
const STYLES = {
  container: { fontFamily: "Georgia, 'Times New Roman', Times, serif", backgroundColor: "#f4f4f4", minHeight: "100vh", padding: "20px" },
  centerContainer: { textAlign: "center", padding: "60px 20px", fontFamily: "sans-serif" },
  errorContainer: { textAlign: "center", padding: "60px 20px", fontFamily: "sans-serif", color: "#d32f2f" },
  controlBar: { maxWidth: "800px", margin: "0 auto 20px auto", background: "#ffffff", padding: "15px 20px", borderRadius: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" },
  controlHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  btnPrimary: { backgroundColor: "#003366", color: "#ffffff", border: "none", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", borderRadius: "4px", cursor: "pointer", fontFamily: "sans-serif" },
  tabGroup: { display: "flex", gap: "10px", borderTop: "1px solid #eee", paddingTop: "12px" },
  tabBtn: (isActive) => ({ padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer", fontFamily: "sans-serif", fontSize: "13px", fontWeight: "bold", backgroundColor: isActive ? "#003366" : "#e0e0e0", color: isActive ? "#ffffff" : "#333333" }),
  paper: { width: "210mm", minHeight: "297mm", height: "auto", margin: "0 auto", backgroundColor: "#ffffff", padding: "8mm 12mm 6mm 12mm", boxSizing: "border-box", boxShadow: "0 0 10px rgba(0,0,0,0.15)", color: "#111111", display: "flex", flexDirection: "column", justifyContent: "flex-start" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "10px", marginTop: "4px" },
  th: (align = "left") => ({ border: "1px solid #333333", padding: "4px 6px", textAlign: align }),
  td: (align = "left", isBold = false) => ({ border: "1px solid #333333", padding: "4px 6px", textAlign: align, fontWeight: isBold ? "bold" : "normal" }),
};

// -----------------------------------------------------------------------------
// 3. MAIN REPORT COMPONENT
// -----------------------------------------------------------------------------
function Reports() {
  const [activeTab, setActiveTab] = useState(CONFIG.DEFAULT_TAB);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadTimestamp, setDownloadTimestamp] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      let fetchedData = null;

      for (const url of CONFIG.API_ENDPOINTS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              fetchedData = result.data;
              break;
            }
          }
        } catch (err) {
          console.warn(`Could not fetch report from ${url}`);
        }
      }

      if (fetchedData) {
        setReportData(fetchedData);
      } else {
        setError(UI_TEXT.ERROR_NETWORK);
      }
      setLoading(false);
    };

    fetchReportData();
  }, []);

  const handleDownloadPDF = () => {
    const now = new Date();

    setDownloadTimestamp({
      date: now.toLocaleDateString(CONFIG.DATE_FORMAT_LOCALE, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }),
      time: now.toLocaleTimeString(CONFIG.DATE_FORMAT_LOCALE, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      tz: CONFIG.TIMEZONE
    });

    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 300);
    });
  };

  if (loading) {
    return (
      <div style={STYLES.centerContainer}>
        <h2>{UI_TEXT.LOADING_TITLE}</h2>
        <p style={{ color: "#666" }}>{UI_TEXT.LOADING_SUBTITLE}</p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div style={STYLES.errorContainer}>
        <h2>{UI_TEXT.ERROR_TITLE}</h2>
        <p>{error || UI_TEXT.ERROR_DEFAULT}</p>
        <button onClick={() => window.location.reload()} style={STYLES.btnPrimary}>
          {UI_TEXT.RETRY_BTN}
        </button>
      </div>
    );
  }

  const currentTs = downloadTimestamp
    ? `${downloadTimestamp.date} • ${downloadTimestamp.time} ${downloadTimestamp.tz}`
    : `${new Date().toLocaleDateString(CONFIG.DATE_FORMAT_LOCALE, { day: "2-digit", month: "short", year: "numeric" })} • ${new Date().toLocaleTimeString(CONFIG.DATE_FORMAT_LOCALE, { hour: "2-digit", minute: "2-digit", second: "2-digit" })} ${CONFIG.TIMEZONE}`;

  return (
    <div style={STYLES.container}>
      {/* Control Bar */}
      <div className="no-print" style={STYLES.controlBar}>
        <div style={STYLES.controlHeader}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "sans-serif", fontSize: "16px", color: "#111" }}>
              {UI_TEXT.HEADER_TITLE}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontFamily: "sans-serif", fontSize: "12px", color: "#2e7d32", fontWeight: "bold" }}>
              {UI_TEXT.LIVE_STATUS}
            </p>
          </div>
          <button onClick={handleDownloadPDF} style={STYLES.btnPrimary}>
            {UI_TEXT.PRINT_BTN}
          </button>
        </div>

        <div style={STYLES.tabGroup}>
          <button onClick={() => setActiveTab("sales")} style={STYLES.tabBtn(activeTab === "sales")}>
            {UI_TEXT.TAB_SALES}
          </button>
          <button onClick={() => setActiveTab("govt")} style={STYLES.tabBtn(activeTab === "govt")}>
            {UI_TEXT.TAB_GOVT}
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div ref={reportRef} className="printable-report" style={STYLES.paper}>
        <div className="document-body">
          {/* Header Block */}
          <div style={{ textAlign: "center", borderBottom: "2px double #000000", paddingBottom: "6px", marginBottom: "8px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              {activeTab === "sales" ? UI_TEXT.TITLE_SALES : UI_TEXT.TITLE_GOVT}
            </div>
            <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", marginTop: "2px" }}>
              {reportData?.department || UI_TEXT.DEFAULT_VAL}
            </div>
            <div style={{ fontSize: "9px", fontStyle: "italic", marginTop: "2px", color: "#444444" }}>
              {UI_TEXT.SUBHEADER_TAG}
            </div>
          </div>

          {/* Dynamic Metadata */}
          <table style={{ width: "100%", fontSize: "10px", marginBottom: "8px", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "1px 0", fontWeight: "bold", width: "18%" }}>{UI_TEXT.REF_NO}</td>
                <td style={{ padding: "1px 0", width: "32%" }}>{reportData?.reportId || UI_TEXT.DEFAULT_VAL}</td>
                <td style={{ padding: "1px 0", fontWeight: "bold", width: "18%" }}>{UI_TEXT.DATE_ISSUE}</td>
                <td style={{ padding: "1px 0", width: "32%" }}>{reportData?.dateOfIssue || UI_TEXT.DEFAULT_VAL}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0", fontWeight: "bold" }}>{UI_TEXT.SUBJECT}</td>
                <td style={{ padding: "1px 0" }} colSpan="3">
                  <strong>{activeTab === "sales" ? UI_TEXT.SUBJECT_SALES : (reportData?.title || UI_TEXT.DEFAULT_VAL)}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0", fontWeight: "bold" }}>{UI_TEXT.SYS_SOURCE}</td>
                <td style={{ padding: "1px 0" }} colSpan="3">{reportData?.generatedBy || UI_TEXT.DEFAULT_VAL}</td>
              </tr>
            </tbody>
          </table>

          <hr style={{ border: "0", borderTop: "1px solid #cccccc", margin: "6px 0 8px 0" }} />

          {/* TAB 1: SALES VIEW */}
          {activeTab === "sales" && (
            <>
              <div style={{ marginBottom: "8px" }}>
                <h4 style={{ fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "2px", margin: "0 0 4px 0" }}>
                  {UI_TEXT.SEC_1_SALES_TITLE}
                </h4>
                <p style={{ fontSize: "10px", lineHeight: "1.3", margin: 0, textAlign: "justify" }}>
                  {UI_TEXT.SEC_1_SALES_BODY}
                </p>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <h4 style={{ fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "2px", margin: "0 0 4px 0" }}>
                  {UI_TEXT.SEC_2_SALES_TITLE}
                </h4>
                <table style={STYLES.table}>
                  <thead>
                    <tr style={{ backgroundColor: "#f0f0f0" }}>
                      {TABLE_HEADERS.SALES.map((h, i) => (
                        <th key={i} style={STYLES.th(i === 0 ? "left" : i === 1 ? "center" : "right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.salesData?.length > 0 ? (
                      reportData.salesData.map((row, index) => (
                        <tr key={index}>
                          <td style={STYLES.td("left")}>{row.period}</td>
                          <td style={STYLES.td("center")}>{row.orders}</td>
                          <td style={STYLES.td("right")}>{row.grossRevenue}</td>
                          <td style={STYLES.td("right")}>{row.discounts}</td>
                          <td style={STYLES.td("right", true)}>{row.netRevenue}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} style={{ border: "1px solid #333333", padding: "6px", textAlign: "center", color: "#666666", fontStyle: "italic" }}>{UI_TEXT.NO_SALES_DATA}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 2: GOVERNMENT VIEW */}
          {activeTab === "govt" && (
            <>
              <div style={{ marginBottom: "8px" }}>
                <h4 style={{ fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "2px", margin: "0 0 4px 0" }}>
                  {UI_TEXT.SEC_1_GOVT_TITLE}
                </h4>
                <p style={{ fontSize: "10px", lineHeight: "1.3", margin: 0, textAlign: "justify" }}>
                  {UI_TEXT.SEC_1_GOVT_BODY}
                </p>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <h4 style={{ fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "2px", margin: "0 0 4px 0" }}>
                  {UI_TEXT.SEC_2_GOVT_TITLE}
                </h4>
                <table style={STYLES.table}>
                  <thead>
                    <tr style={{ backgroundColor: "#f0f0f0" }}>
                      {TABLE_HEADERS.METRICS.map((h, i) => (
                        <th key={i} style={STYLES.th(i === 0 ? "left" : i === 1 ? "center" : "right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.metrics?.length > 0 ? (
                      reportData.metrics.map((row, index) => (
                        <tr key={index}>
                          <td style={STYLES.td("left")}>{row.category}</td>
                          <td style={STYLES.td("center")}>{row.status}</td>
                          <td style={STYLES.td("right", true)}>{row.rate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} style={{ border: "1px solid #333333", padding: "6px", textAlign: "center", color: "#666666", fontStyle: "italic" }}>{UI_TEXT.NO_METRICS_DATA}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <h4 style={{ fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "2px", margin: "0 0 4px 0" }}>
                  {UI_TEXT.SEC_3_GOVT_TITLE}
                </h4>
                <table style={{ ...STYLES.table, fontSize: "9.5px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f0f0f0" }}>
                      {TABLE_HEADERS.TAX.map((h, i) => (
                        <th key={i} style={STYLES.th(i < 2 ? "left" : "right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.taxSummary?.length > 0 ? (
                      reportData.taxSummary.map((row, index) => (
                        <tr key={index}>
                          <td style={STYLES.td("left")}>{row.hsn}</td>
                          <td style={STYLES.td("left")}>{row.category}</td>
                          <td style={STYLES.td("right")}>{row.taxableVal}</td>
                          <td style={STYLES.td("right")}>{row.cgst}</td>
                          <td style={STYLES.td("right")}>{row.sgst}</td>
                          <td style={STYLES.td("right", true)}>{row.totalTax}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} style={{ border: "1px solid #333333", padding: "6px", textAlign: "center", color: "#666666", fontStyle: "italic" }}>{UI_TEXT.NO_TAX_DATA}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Statutory Declaration */}
          <div style={{ marginBottom: "6px", fontSize: "9px", lineHeight: "1.2", backgroundColor: "#fafafa", padding: "6px", border: "1px solid #dddddd" }}>
            <strong>{UI_TEXT.DECLARATION_LABEL}</strong> {UI_TEXT.DECLARATION_TEXT}
          </div>
        </div>

        {/* Signatures */}
        <div className="signature-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "8px", marginBottom: "6px", flexShrink: 0 }}>
          <div style={{ width: "30%", textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #000000", height: "30px", marginBottom: "4px" }}></div>
            <div style={{ fontSize: "9.5px", fontWeight: "bold" }}>{UI_TEXT.SIG_SYSTEM}</div>
            <div style={{ fontSize: "8px", color: "#555555" }}>{UI_TEXT.SIG_SYSTEM_SUB}</div>
          </div>

          <div style={{ width: "30%", display: "flex", justifyContent: "center" }}>
            <div className="digital-verification-stamp">
              <div className="stamp-inner-ring">
                <span className="stamp-arc-top">{UI_TEXT.STAMP_ARC}</span>
                <span className="stamp-main-badge">{UI_TEXT.STAMP_MAIN}</span>
                <span className="stamp-sub-text">{UI_TEXT.STAMP_SUB}</span>
              </div>
            </div>
          </div>

          <div style={{ width: "30%", textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #000000", height: "30px", marginBottom: "4px" }}></div>
            <div style={{ fontSize: "9.5px", fontWeight: "bold" }}>{UI_TEXT.SIG_NODAL}</div>
            <div style={{ fontSize: "8px", color: "#555555" }}>{UI_TEXT.SIG_NODAL_SUB}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="report-footer" style={{ borderTop: "1px solid #000000", paddingTop: "4px", marginTop: "8px", flexShrink: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", fontSize: "8px", color: "#333333", lineHeight: "1.2", width: "100%" }}>
          <div style={{ textAlign: "left" }}>
            <strong>{UI_TEXT.REF_LABEL}</strong> {reportData?.reportId || UI_TEXT.DEFAULT_VAL}
          </div>
          <div style={{ textAlign: "center", whiteSpace: "nowrap", padding: "0 12px" }}>
            <strong>{UI_TEXT.GEN_LABEL}</strong> {currentTs}
          </div>
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            {UI_TEXT.PAGE_LABEL} 1 {UI_TEXT.OF_LABEL} 1
          </div>
        </div>

        {/* CSS Overlay */}
        <style>{`
          /* Circular Verification Stamp */
          .digital-verification-stamp {
            width: 75px;
            height: 75px;
            border: 2px double #1e3a8a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1e3a8a;
            transform: rotate(-8deg);
            padding: 2px;
            box-sizing: border-box;
            background-color: rgba(255, 255, 255, 0.95);
          }
          .stamp-inner-ring {
            width: 65px;
            height: 65px;
            border: 1px dashed #1e3a8a;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
            padding: 2px;
          }
          .stamp-arc-top { font-size: 5.5px; font-weight: 800; letter-spacing: 0.5px; }
          .stamp-main-badge { font-size: 7.5px; font-weight: 900; border-top: 1px solid #1e3a8a; border-bottom: 1px solid #1e3a8a; padding: 1px 0; margin: 1px 0; width: 90%; letter-spacing: 0.5px; }
          .stamp-sub-text { font-size: 5.5px; font-weight: 700; letter-spacing: 0.4px; }

          @media print {
            html,
            body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print {
              display: none !important;
            }

            .printable-report {
              width: 210mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              box-shadow: none !important;
              padding: 8mm 12mm 6mm 12mm !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-start !important;
              overflow: visible !important;
              break-after: auto !important;
              page-break-after: auto !important;
            }

            .document-body {
              flex: 0 0 auto !important;
              width: 100% !important;
            }

            .signature-block {
              display: flex !important;
              margin-top: 8px !important;
              margin-bottom: 10px !important;
              flex-shrink: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .report-footer {
              position: static !important;
              display: grid !important;
              grid-template-columns: 1fr auto 1fr !important;
              width: 100% !important;
              margin-top: 4px !important;
              margin-bottom: 0 !important;
              padding-top: 4px !important;
              flex-shrink: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default Reports;
