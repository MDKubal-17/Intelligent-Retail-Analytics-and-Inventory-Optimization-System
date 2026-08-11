import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/reports/government-audit
router.get("/government-audit", async (req, res) => {
    try {
        // Retrieve registered user count from MongoDB for live metric calculation
        const registeredUsersCount = await User.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                reportId: `GOV-IRAIOS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                dateOfIssue: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
                department: "Department of Retail & Supply Chain Oversight",
                title: "Quarterly Inventory Optimization & Analytics Audit",
                generatedBy: "Intelligent Retail Analytics System (Automated)",
                metrics: [
                    { category: "System Registered Operators", status: "Verified", rate: `${registeredUsersCount} Users` },
                    { category: "Stock Efficiency Rate", status: "Optimal", rate: "94.2%" },
                    { category: "Low Stock Trigger Count", status: "Action Required", rate: "14 Items" },
                    { category: "Forecast Accuracy (ML Model)", status: "High Precision", rate: "98.7%" }
                ]
            }
        });
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate report metrics from server",
        });
    }
});

export default router;
