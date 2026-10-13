import express from "express";
import crypto from "node:crypto";
import { parse } from "csv-parse/sync";
import User from "../models/User.js";

const router = express.Router();

const INVENTORY_API =
    process.env.FLASK_INVENTORY_URL ||
    "http://127.0.0.1:5000/api/data/inventory";

const toNumber = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(number) ? number : null;
};

// GET /api/reports/government-audit
router.get("/government-audit", async (req, res) => {
    try {
        // Retrieve operator count from MongoDB and inventory from Flask.
        const [registeredUsersCount, inventoryResponse] =
            await Promise.all([
                User.countDocuments(),
                fetch(INVENTORY_API, {
                    signal: AbortSignal.timeout(8000),
                }),
            ]);

        if (!inventoryResponse.ok) {
            console.error(
                "Flask inventory API returned:",
                inventoryResponse.status
            );

            return res.status(502).json({
                success: false,
                message: "Inventory service returned an unsuccessful response.",
            });
        }

        const csvText = await inventoryResponse.text();

        // Parse CSV correctly, including quoted values and commas.
        const inventoryItems = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            trim: true,
        });

        // Validate that the CSV contains the required columns.
        if (
            inventoryItems.length > 0 &&
            !(
                "current_stock" in inventoryItems[0] &&
                "reorder_level" in inventoryItems[0]
            )
        ) {
            return res.status(502).json({
                success: false,
                message: "Inventory CSV is missing required stock columns.",
            });
        }

        const validStockItems = inventoryItems.filter((item) => {
            return (
                toNumber(item.current_stock) !== null &&
                toNumber(item.reorder_level) !== null
            );
        });

        const totalItems = inventoryItems.length;

        const lowStockItems = validStockItems.filter((item) => {
            return (
                toNumber(item.current_stock) <=
                toNumber(item.reorder_level)
            );
        }).length;

        const stockEfficiency =
            validStockItems.length > 0
                ? Number(
                    (
                        ((validStockItems.length - lowStockItems) /
                            validStockItems.length) *
                        100
                    ).toFixed(2)
                )
                : null;

        const inventoryValuation = inventoryItems.reduce(
            (total, item) => {
                const recordedValue = toNumber(item.inventory_value);

                if (recordedValue !== null) {
                    return total + recordedValue;
                }

                const stock = toNumber(item.current_stock);
                const price = toNumber(item.unit_price);

                if (stock !== null && price !== null) {
                    return total + stock * price;
                }

                return total;
            },
            0
        );

        const reportId = `IRAIOS-${crypto.randomUUID()}`;

        const metrics = [
            {
                category: "Registered System Operators",
                status: "Informational",
                rate: `${registeredUsersCount} Users`,
            },
            {
                category: "Total Inventory Items",
                status: "Informational",
                rate: `${totalItems} Items`,
            },
            {
                category: "Low Stock Trigger Count",
                status: lowStockItems > 0
                    ? "Action Required"
                    : "Within Threshold",
                rate: `${lowStockItems} Items`,
            },
            {
                category: "Stock Threshold Compliance",
                status: stockEfficiency === null
                    ? "Insufficient Data"
                    : lowStockItems > 0
                        ? "Review Required"
                        : "Within Threshold",
                rate: stockEfficiency === null
                    ? "N/A"
                    : `${stockEfficiency}%`,
            },
            {
                category: "Inventory Valuation",
                status: "Calculated",
                rate: `₹${inventoryValuation.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`,
            },
        ];

        return res.status(200).json({
            success: true,
            data: {
                reportId,
                dateOfIssue: new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                }),
                generatedAt: new Date().toISOString(),
                timezone: "Asia/Kolkata",
                department: "Retail Inventory & Analytics",
                title: "Inventory Audit & Optimization Summary",
                generatedBy: "Intelligent Retail Analytics System",
                metrics,
            },
        });
    } catch (error) {
        console.error("Error generating inventory report:", error);

        const isInventoryApiError =
            error.name === "TimeoutError" ||
            error.name === "AbortError" ||
            error.cause?.code === "ECONNREFUSED";

        return res.status(isInventoryApiError ? 502 : 500).json({
            success: false,
            message: isInventoryApiError
                ? "Unable to connect to the Flask inventory service."
                : "Failed to generate inventory report.",
        });
    }
});



const SALES_API =
    process.env.FLASK_SALES_URL ||
    "http://127.0.0.1:5000/api/sales";

// GET /api/reports/sales-performance
router.get("/sales-performance", async (req, res) => {
    try {
        const response = await fetch(SALES_API, {
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            console.error("Flask sales API returned:", response.status);

            return res.status(502).json({
                success: false,
                message: "Sales service returned an unsuccessful response.",
            });
        }

        const contentType = response.headers.get("content-type") || "";
        let sales;

        if (contentType.includes("application/json")) {
            const payload = await response.json();

            sales = Array.isArray(payload)
                ? payload
                : payload.data ?? payload.sales ?? payload.records ?? [];

            if (!Array.isArray(sales)) {
                return res.status(502).json({
                    success: false,
                    message: "Sales API returned an unsupported JSON format.",
                });
            }
        } else {
            const csvText = await response.text();

            sales = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                bom: true,
                trim: true,
            });
        }

        return res.status(200).json({
            success: true,
            count: sales.length,
            data: sales,
        });
    } catch (error) {
        console.error("Error fetching sales data:", error);

        const isConnectionError =
            error.name === "TimeoutError" ||
            error.name === "AbortError" ||
            error.cause?.code === "ECONNREFUSED";

        return res.status(isConnectionError ? 502 : 500).json({
            success: false,
            message: isConnectionError
                ? "Unable to connect to the Flask sales service."
                : "Failed to retrieve sales data.",
        });
    }
});


export default router;
