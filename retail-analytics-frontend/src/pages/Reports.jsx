import React, { useState, useEffect, useRef } from "react";

function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadTimestamp, setDownloadTimestamp] = useState(null);
  const reportRef = useRef(null);

  // Fetch live database audit metrics when the component mounts
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // Update API endpoint if your backend server runs on a different port or URL
        const response = await fetch("http://localhost:5000/api/reports/government-audit");
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setReportData(result.data);
        } else {
          setError("Failed to load audit metrics from server.");
        }
      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("Unable to connect to the report backend service.");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const handleDownloadPDF = () => {
    // Generate ISO + Local format download timestamp
    const now = new Date();
    const formattedTimestamp = `${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-GB")} (UTC+05:30)`;
    
    setDownloadTimestamp(formattedTimestamp);

    // Allow DOM state update before launching print window
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: "sans-serif" }}>
        <h2>Generating Government Official Compliance Report...</h2>
        <p style={{ color: "#666" }}>Retrieving verified audit ledgers from database.</p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#d32f2f", fontFamily: "sans-serif" }}>
        <h2>System Error</h2>
        <p>{error || "Unable to render report data."}</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif", backgroundColor: "#f4f4f4", minHeight: "100vh", padding: "20px" }}>
      
      {/* Interactive Control Bar (Excluded from PDF output) */}
      <div 
        className="no-print" 
        style={{ 
          maxWidth: "800px", 
          margin: "0 auto 20px auto", 
          display: "flex", 
          justify: "space-between", 
          alignItems: "center", 
          background: "#ffffff", 
          padding: "15px 20px", 
          borderRadius: "6px", 
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)" 
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: "sans-serif", fontSize: "16px", color: "#111" }}>
            Government Official Report Module
          </h3>
          <p style={{ margin: "4px 0 0 0", fontFamily: "sans-serif", fontSize: "12px", color: "#2e7d32", fontWeight: "bold" }}>
            ● Database Connected & Synchronized
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          style={{
            backgroundColor: "#003366",
            color: "#ffffff",
            border: "none",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "bold",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "sans-serif",
            transition: "background-color 0.2s ease"
          }}
        >
          Download / Save as PDF
        </button>
      </div>

      {/* Printable Government Document Canvas */}
      <div 
        ref={reportRef} 
        className="printable-report"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          padding: "20mm 20mm 15mm 20mm",
          boxSizing: "border-box",
          boxShadow: "0 0 10px rgba(0,0,0,0.15)",
          color: "#111111",
          position: "relative"
        }}
      >
        {/* Government Header Block */}
        <div style={{ textAlign: "center", borderBottom: "3px double #000000", paddingBottom: "12px", marginBottom: "20px" }}>
          <div style={{ fontSize: "22px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
            OFFICIAL COMPLIANCE REPORT
          </div>
          <div style={{ fontSize: "13px", fontWeight: "bold", textTransform: "uppercase", marginTop: "4px" }}>
            {reportData.department}
          </div>
          <div style={{ fontSize: "11px", fontStyle: "italic", marginTop: "2px", color: "#444444" }}>
            Confidential & Authorized Record • National Retail Oversight Portal
          </div>
        </div>

        {/* Metadata Header Grid */}
        <table style={{ width: "100%", fontSize: "12px", marginBottom: "20px", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 0", fontWeight: "bold", width: "18%" }}>Ref No:</td>
              <td style={{ padding: "4px 0", width: "32%" }}>{reportData.reportId}</td>
              <td style={{ padding: "4px 0", fontWeight: "bold", width: "18%" }}>Date of Issue:</td>
              <td style={{ padding: "4px 0", width: "32%" }}>{reportData.dateOfIssue}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", fontWeight: "bold" }}>Subject:</td>
              <td style={{ padding: "4px 0" }} colSpan="3">
                <strong>{reportData.title}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", fontWeight: "bold" }}>System Source:</td>
              <td style={{ padding: "4px 0" }} colSpan="3">{reportData.generatedBy}</td>
            </tr>
          </tbody>
        </table>

        <hr style={{ border: "0", borderTop: "1px solid #cccccc", margin: "15px 0" }} />

        {/* Executive Overview */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "14px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "4px", marginBottom: "10px" }}>
            1. Executive Overview & Compliance Summary
          </h4>
          <p style={{ fontSize: "12px", lineHeight: "1.6", margin: 0, textAlign: "justify" }}>
            This document represents the formal periodic assessment generated by the Intelligent Retail Analytics and Inventory Optimization System. All audit metrics contained herein adhere to official data retention protocols. The statistical evaluations below summarize operational performance, supply chain balance metrics, and forecasted inventory deficits requiring statutory administrative intervention.
          </p>
        </div>

        {/* Dynamic Audit Table */}
        <div style={{ marginBottom: "25px" }}>
          <h4 style={{ fontSize: "14px", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: "4px", marginBottom: "10px" }}>
            2. Verified System Audit Metrics
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "8px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0", borderTop: "1px solid #000000", borderBottom: "1px solid #000000" }}>
                <th style={{ border: "1px solid #333333", padding: "8px", textAlign: "left" }}>Category Parameter</th>
                <th style={{ border: "1px solid #333333", padding: "8px", textAlign: "center" }}>Compliance Status</th>
                <th style={{ border: "1px solid #333333", padding: "8px", textAlign: "right" }}>Recorded Metric</th>
              </tr>
            </thead>
            <tbody>
              {reportData.metrics && reportData.metrics.map((row, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid #333333", padding: "8px" }}>{row.category}</td>
                  <td style={{ border: "1px solid #333333", padding: "8px", textAlign: "center" }}>{row.status}</td>
                  <td style={{ border: "1px solid #333333", padding: "8px", textAlign: "right", fontWeight: "bold" }}>{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statutory Clause */}
        <div style={{ marginBottom: "35px", fontSize: "11px", lineHeight: "1.5", backgroundColor: "#fafafa", padding: "10px", border: "1px solid #dddddd" }}>
          <strong>Statutory Declaration:</strong> Information rendered within this statement is retrieved directly from system database ledgers. Unverified modification or falsification of this electronic record is subject to regulatory penalties under applicable data integrity acts.
        </div>

        {/* Dual Signature Block */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", pageBreakInside: "avoid" }}>
          <div style={{ width: "40%", textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #000000", height: "40px", marginBottom: "6px" }}></div>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Automated System Verification</div>
            <div style={{ fontSize: "10px", color: "#555555" }}>Cryptographic Lead Analyst Seal</div>
          </div>
          <div style={{ width: "40%", textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #000000", height: "40px", marginBottom: "6px" }}></div>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Authorized Nodal Officer</div>
            <div style={{ fontSize: "10px", color: "#555555" }}>Signature & Official Stamp</div>
          </div>
        </div>

        {/* Official Footer with Dynamic Download Timestamp */}
        <div 
          style={{ 
            position: "absolute", 
            bottom: "12mm", 
            left: "20mm", 
            right: "20mm", 
            borderTop: "1px solid #000000", 
            paddingTop: "6px", 
            display: "flex", 
            justify: "space-between", 
            fontSize: "10px", 
            color: "#333333" 
          }}
        >
          <div><strong>Report Ref:</strong> {reportData.reportId}</div>
          <div>
            <strong>Download Timestamp:</strong> {downloadTimestamp || "PREVIEW ONLY (Not Exported)"}
          </div>
          <div>Page 1 of 1</div>
        </div>
      </div>

      {/* Global CSS rules for Print Engine */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-report {
            box-shadow: none !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
        }
      `}</style>
    </div>
  );
}

export default Reports;
