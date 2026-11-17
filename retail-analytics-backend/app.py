from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import csv
import io
import os
import joblib
import pandas as pd
from datetime import datetime
#from chronos import Chronos2Pipeline
from google import genai
from dotenv import load_dotenv
from google.genai import types
# from mlxtend.frequent_patterns import apriori, association_rules
# from mlxtend.preprocessing import TransactionEncoder
# import recommendationRoutes from "./routes/recommendationRoutes.js";
import requests
from urllib.parse import quote
import json
import resend

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
resend.api_key = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL")
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("Gemini AI assistant enabled.")
else:
    client = None
    print("WARNING: GEMINI_API_KEY not found.")
# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

# ============================================================
# NODE.JS MONGODB API CONFIGURATION
# ============================================================

NODE_API_URL = os.getenv("NODE_API_URL", "").strip().rstrip("/")
NODE_API_KEY = os.getenv("INTERNAL_API_KEY", "").strip()

if not NODE_API_URL:
    raise RuntimeError("NODE_API_URL is not configured.")

if not NODE_API_KEY:
    raise RuntimeError("INTERNAL_API_KEY is not configured.")

print("MongoDB API configured:", NODE_API_URL)

def mongo_api(method, collection, payload=None):
    """
    Communicate with the deployed Node.js API.
    Node.js manages all MongoDB operations through Mongoose.
    """

    if not NODE_API_URL:
        raise RuntimeError("NODE_API_URL is missing.")

    headers = {
        "Content-Type": "application/json",
        "x-internal-api-key": NODE_API_KEY
    }

    api_url = f"{NODE_API_URL}/api/data/{collection}"

    try:
        response = requests.request(
            method=method,
            url=api_url,
            json=payload,
            headers=headers,
            timeout=60
        )

        if response.status_code == 204 or not response.content:
            response.raise_for_status()
            return None

        response.raise_for_status()

        return response.json()

    except requests.exceptions.Timeout:
        raise RuntimeError(
            f"Node.js API timed out while accessing {collection}."
        )

    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            f"Unable to connect to Node.js API: {NODE_API_URL}"
        )

    except requests.exceptions.HTTPError as error:
        raise RuntimeError(
            f"Node.js API error for {collection}: "
            f"HTTP {response.status_code} - {response.text[:500]}"
        )

    except requests.exceptions.JSONDecodeError:
        raise RuntimeError(
            f"Node.js API returned invalid JSON for {collection}."
        )


def csv_response(rows, fieldnames, filename):
    """Return MongoDB records as CSV for existing CSV-download endpoints."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

    response = make_response(output.getvalue())
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

# CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# ============================================================
# RECOMMENDATION SERVICE CONNECTION
# ============================================================

RECOMMENDATION_API_URL = os.getenv(
    "RECOMMENDATION_API_URL",
    "http://127.0.0.1:8000"
).rstrip("/")

# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Persistent inventory, sales, transactions and forecast history are stored in MongoDB.


# ============================================================
# CSV FIELD NAMES
# ============================================================

INVENTORY_FIELDS = [
    "product_id",
    "product",
    "category",
    "current_stock",
    "reorder_level",
    "unit_price",
    "inventory_value",
    "status",
    "img_url"
]

SALES_FIELDS = [
    "date",
    "product_id",
    "product",
    "category",
    "quantity",
    "unit_price",
    "discount_percent",
    "revenue",
    "transaction_id"
]

TRANSACTION_FIELDS = [
    "transaction_id",
    "date",
    "product_id",
    "product",
    "action",
    "quantity",
    "quantity_change",
    "reason"
]
# ============================================================
# LAZY-LOADED ML MODELS
# ============================================================

_rf_model = None
_le_product = None
_le_category = None
_chronos_pipeline = None

def get_rf_model():
    global _rf_model, _le_product, _le_category
    if _rf_model is None:
        try:
            print("Loading Random Forest model...")
            _rf_model = joblib.load(os.path.join(BASE_DIR, "rf_model.pkl"))
            _le_product = joblib.load(os.path.join(BASE_DIR, "le_product.pkl"))
            _le_category = joblib.load(os.path.join(BASE_DIR, "le_category.pkl"))
            print("Random Forest model loaded successfully.")
        except Exception as error:
            print("WARNING: ML model could not be loaded:", error)
    return _rf_model, _le_product, _le_category

def get_chronos_pipeline():
    global _chronos_pipeline
    if _chronos_pipeline is None:
        try:
            print("Loading Amazon Chronos-2 model...")
            from chronos import Chronos2Pipeline
            import torch
            _chronos_pipeline = Chronos2Pipeline.from_pretrained(
                "amazon/chronos-2",
                device_map="cpu",
                torch_dtype=torch.float32
            )
            print("Chronos-2 loaded successfully.")
        except Exception as error:
            print("WARNING: Chronos-2 could not be loaded:", error)
    return _chronos_pipeline

# # ============================================================
# # LOAD ML MODEL
# # ============================================================

# try:

#     model = joblib.load(
#         os.path.join(BASE_DIR, "rf_model.pkl")
#     )

#     le_product = joblib.load(
#         os.path.join(BASE_DIR, "le_product.pkl")
#     )

#     le_category = joblib.load(
#         os.path.join(BASE_DIR, "le_category.pkl")
#     )

#     print("Random Forest model loaded successfully.")

# except Exception as error:

#     print("WARNING: ML model could not be loaded.")
#     print(error)

#     model = None
#     le_product = None
#     le_category = None


# ============================================================
# LOAD CHRONOS-2
# ============================================================

# try:

#     print("Loading Amazon Chronos-2 model...")

#     chronos_pipeline = Chronos2Pipeline.from_pretrained(
#         "amazon/chronos-2",
#         device_map="cpu"
#     )

#     print("Chronos-2 loaded successfully.")

# except Exception as error:

#     print("WARNING: Chronos-2 could not be loaded.")
#     print(error)

#     chronos_pipeline = None


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def safe_int(value, default=0):

    try:
        return int(float(value or 0))

    except Exception:
        return default


def safe_float(value, default=0.0):

    try:
        return float(value or 0)

    except Exception:
        return default


def calculate_inventory_status(stock, reorder_level):

    if stock <= reorder_level:
        return "Low Stock"

    return "In Stock"


def generate_transaction_id(prefix="TXN"):

    return (
        prefix
        + datetime.now().strftime(
            "%Y%m%d%H%M%S%f"
        )
    )


# ============================================================
# MONGODB STORAGE HELPERS
# ============================================================

def read_inventory():
    rows = mongo_api("GET", "inventory") or []
    inventory = []

    for row in rows:
        if not row.get("product_id"):
            continue

        stock = safe_int(row.get("current_stock"))
        reorder_level = safe_int(row.get("reorder_level"))
        unit_price = safe_float(row.get("unit_price"))

        inventory.append({
            "product_id": str(row.get("product_id")),
            "product": row.get("product", ""),
            "category": row.get("category", ""),
            "current_stock": str(stock),
            "reorder_level": str(reorder_level),
            "unit_price": str(unit_price),
            "inventory_value": str(round(stock * unit_price, 2)),
            "status": calculate_inventory_status(stock, reorder_level),
            "img_url": row.get("img_url", "")
        })

    return inventory


def write_inventory(inventory):
    rows = []

    for row in inventory:
        stock = safe_int(row.get("current_stock"))
        reorder_level = safe_int(row.get("reorder_level"))
        unit_price = safe_float(row.get("unit_price"))

        rows.append({
            "product_id": str(row.get("product_id", "")),
            "product": row.get("product", ""),
            "category": row.get("category", ""),
            "current_stock": stock,
            "reorder_level": reorder_level,
            "unit_price": unit_price,
            "inventory_value": round(stock * unit_price, 2),
            "status": calculate_inventory_status(stock, reorder_level),
            "img_url": row.get("img_url", "")
        })

    mongo_api("PUT", "inventory", rows)


def read_sales():
    rows = mongo_api("GET", "sales") or []
    sales = []

    for row in rows:
        if not row.get("transaction_id"):
            continue

        quantity = safe_float(row.get("quantity"))
        unit_price = safe_float(row.get("unit_price"))
        discount = safe_float(row.get("discount_percent"))

        sales.append({
            "date": row.get("date", ""),
            "product_id": str(row.get("product_id", "")),
            "product": row.get("product", ""),
            "category": row.get("category", ""),
            "quantity": quantity,
            "unit_price": unit_price,
            "discount_percent": discount,
            "revenue": round(quantity * unit_price * (1 - discount / 100), 2),
            "transaction_id": row.get("transaction_id", "")
        })

    return sales


def append_sale(
    product,
    quantity,
    unit_price,
    discount_percent=0,
    transaction_id=None
):
    if transaction_id is None:
        transaction_id = generate_transaction_id("TXN")

    quantity = safe_float(quantity)
    unit_price = safe_float(unit_price)
    discount_percent = safe_float(discount_percent)

    revenue = quantity * unit_price * (1 - discount_percent / 100)

    mongo_api("POST", "sales", {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "product_id": str(product["product_id"]),
        "product": product.get("product", ""),
        "category": product.get("category", ""),
        "quantity": quantity,
        "unit_price": unit_price,
        "discount_percent": discount_percent,
        "revenue": round(revenue, 2),
        "transaction_id": transaction_id
    })

    return transaction_id, revenue


def add_inventory_transaction(
    product,
    action,
    quantity,
    quantity_change,
    reason="",
    transaction_id=None
):
    # Each stock movement gets its own unique transaction ID.
    transaction_id = generate_transaction_id("ITXN")

    mongo_api("POST", "transactions", {
        "transaction_id": transaction_id,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "product_id": str(product["product_id"]),
        "product": product.get("product", ""),
        "action": action,
        "quantity": safe_int(quantity),
        "quantity_change": safe_int(quantity_change),
        "reason": reason
    })

    return transaction_id


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({

        "message":
            "Retail Analytics Backend is running!",

        "status":
            "success",

        "endpoints": {

            "products":
                "/api/products",

            "dashboard":
                "/api/dashboard",

            "sales":
                "/api/sales",

            "transactions":
                "/api/transactions",

            "inventory_action":
                "/api/inventory/action",

            "forecast":
                "/api/forecast",

            "predict":
                "/predict"
        }
    })


# ============================================================
# RAW INVENTORY CSV
# ============================================================

@app.route(
    "/api/inventory/data/inventory",
    methods=["GET"]
)
@app.route(
    "/api/data/inventory",
    methods=["GET"]
)
def serve_inventory_csv():
    try:
        return csv_response(read_inventory(), INVENTORY_FIELDS, "inventory_data.csv")
    except Exception as error:
        return jsonify({"error": str(error)}), 500


# ============================================================
# RAW SALES CSV
# ============================================================

@app.route(
    "/api/inventory/data/sales",
    methods=["GET"]
)
@app.route(
    "/api/data/sales",
    methods=["GET"]
)
def serve_sales_csv():
    try:
        return csv_response(read_sales(), SALES_FIELDS, "sales_data.csv")
    except Exception as error:
        return jsonify({"error": str(error)}), 500


# ============================================================
# GET PRODUCTS
# ============================================================

@app.route(
    "/api/products",
    methods=["GET"]
)
def get_products():

    try:

        inventory = read_inventory()

        products = []

        for item in inventory:

            products.append({

                "id":
                    safe_int(
                        item["product_id"]
                    ),

                "product":
                    item["product"],

                "category":
                    item["category"],

                "current_stock":
                    safe_int(
                        item["current_stock"]
                    ),

                "reorder_level":
                    safe_int(
                        item["reorder_level"]
                    ),

                "unit_price":
                    safe_float(
                        item["unit_price"]
                    ),

                "inventory_value":
                    safe_float(
                        item["inventory_value"]
                    ),

                "status":
                    item["status"],

                "img_url":
                    item.get(
                        "img_url",
                        ""
                    )
            })

        return jsonify(products)

    except Exception as error:

        return jsonify({
            "error":
                str(error)
        }), 500


# ============================================================
# ADD PRODUCT
# ============================================================

@app.route(
    "/api/products",
    methods=["POST", "OPTIONS"]
)
def add_product():

    if request.method == "OPTIONS":

        return "", 200

    try:

        data = (
            request.get_json(
                force=True
            )
            or {}
        )

        product = str(
            data.get(
                "product",
                ""
            )
        ).strip()

        category = str(
            data.get(
                "category",
                ""
            )
        ).strip()

        current_stock = safe_int(
            data.get(
                "current_stock",
                0
            )
        )

        reorder_level = safe_int(
            data.get(
                "reorder_level",
                0
            )
        )

        unit_price = safe_float(
            data.get(
                "unit_price",
                0
            )
        )

        img_url = str(
            data.get(
                "img_url",
                ""
            )
        ).strip()

        if not product:

            return jsonify({
                "error":
                    "Product name is required"
            }), 400

        if not category:

            return jsonify({
                "error":
                    "Category is required"
            }), 400

        inventory = read_inventory()

        new_id = max(
            [
                safe_int(
                    row["product_id"]
                )
                for row in inventory
                if row.get("product_id")
            ],
            default=0
        ) + 1

        inventory_value = (
            current_stock
            * unit_price
        )

        status = calculate_inventory_status(
            current_stock,
            reorder_level
        )

        new_product = {

            "product_id":
                str(new_id),

            "product":
                product,

            "category":
                category,

            "current_stock":
                str(current_stock),

            "reorder_level":
                str(reorder_level),

            "unit_price":
                str(unit_price),

            "inventory_value":
                str(
                    round(
                        inventory_value,
                        2
                    )
                ),

            "status":
                status,

            "img_url":
                img_url
        }

        inventory.append(
            new_product
        )

        write_inventory(
            inventory
        )

        return jsonify({

            "message":
                "Product added successfully",

            "product":
                new_product

        }), 201

    except Exception as error:

        return jsonify({
            "error":
                str(error)
        }), 500


# ============================================================
# UPDATE PRODUCT
# ============================================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["PUT", "OPTIONS"]
)
def update_product(product_id):

    if request.method == "OPTIONS":

        return "", 200

    try:

        data = (
            request.get_json(
                force=True
            )
            or {}
        )

        inventory = read_inventory()

        product_found = None

        for item in inventory:

            if safe_int(
                item["product_id"]
            ) == product_id:

                product_found = item

                break

        if product_found is None:

            return jsonify({
                "error":
                    "Product not found"
            }), 404

        product = str(
            data.get(
                "product",
                product_found["product"]
            )
        ).strip()

        category = str(
            data.get(
                "category",
                product_found["category"]
            )
        ).strip()

        current_stock = safe_int(
            data.get(
                "current_stock",
                product_found["current_stock"]
            )
        )

        reorder_level = safe_int(
            data.get(
                "reorder_level",
                product_found["reorder_level"]
            )
        )

        unit_price = safe_float(
            data.get(
                "unit_price",
                product_found["unit_price"]
            )
        )

        img_url = str(
            data.get(
                "img_url",
                product_found.get(
                    "img_url",
                    ""
                )
            )
        ).strip()

        inventory_value = (
            current_stock
            * unit_price
        )

        status = calculate_inventory_status(
            current_stock,
            reorder_level
        )

        product_found.update({

            "product":
                product,

            "category":
                category,

            "current_stock":
                str(current_stock),

            "reorder_level":
                str(reorder_level),

            "unit_price":
                str(unit_price),

            "inventory_value":
                str(
                    round(
                        inventory_value,
                        2
                    )
                ),

            "status":
                status,

            "img_url":
                img_url
        })

        write_inventory(
            inventory
        )

        return jsonify({

            "message":
                "Product updated successfully",

            "product":
                product_found

        }), 200

    except Exception as error:

        return jsonify({
            "error":
                str(error)
        }), 500


# ============================================================
# DELETE PRODUCT
# ============================================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["DELETE", "OPTIONS"]
)
def delete_product(product_id):

    if request.method == "OPTIONS":

        return "", 200

    try:

        inventory = read_inventory()

        old_length = len(
            inventory
        )

        inventory = [

            item
            for item in inventory

            if safe_int(
                item["product_id"]
            ) != product_id
        ]

        if len(inventory) == old_length:

            return jsonify({
                "error":
                    "Product not found"
            }), 404

        write_inventory(
            inventory
        )

        return jsonify({

            "message":
                "Product deleted successfully"

        }), 200

    except Exception as error:

        return jsonify({
            "error":
                str(error)
        }), 500


# ============================================================
# GET SALES
# ============================================================

@app.route(
    "/api/sales",
    methods=["GET"]
)
@app.route(
    "/api/inventory/sales",
    methods=["GET"]
)
def get_sales():

    try:

        sales = read_sales()

        # Optional product filter
        product_id = request.args.get(
            "product_id"
        )

        if product_id:

            sales = [

                sale
                for sale in sales

                if str(
                    sale["product_id"]
                ) == str(product_id)
            ]

        # Optional date filter
        date = request.args.get(
            "date"
        )

        if date:

            sales = [

                sale
                for sale in sales

                if sale["date"] == date
            ]

        return jsonify({

            "count":
                len(sales),

            "sales":
                sales

        })

    except Exception as error:

        return jsonify({
            "error":
                str(error)
        }), 500


# ============================================================
# GET TRANSACTIONS
# ============================================================

@app.route(
    "/api/transactions",
    methods=["GET"]
)
@app.route(
    "/api/inventory/transactions",
    methods=["GET"]
)
def get_transactions():
    try:
        transactions = mongo_api("GET", "transactions") or []

        for row in transactions:
            row["product_id"] = safe_int(row.get("product_id"))
            row["quantity"] = safe_int(row.get("quantity"))
            row["quantity_change"] = safe_int(row.get("quantity_change"))

        transactions.sort(
            key=lambda row: row.get("date", ""),
            reverse=True
        )

        return jsonify({
            "count": len(transactions),
            "transactions": transactions
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500


# ============================================================
# INVENTORY ACTION
#
# sell
# damaged
# restock
# adjustment
# ============================================================

@app.route(
    "/api/inventory/action",
    methods=["POST", "OPTIONS"]
)
def inventory_action():

    if request.method == "OPTIONS":

        return "", 200

    try:

        data = (
            request.get_json(
                force=True
            )
            or {}
        )

        # ----------------------------------------------------
        # GET REQUEST DATA
        # ----------------------------------------------------

        if data.get("product_id") is None:

            return jsonify({
                "error":
                    "product_id is required"
            }), 400

        product_id = safe_int(
            data.get(
                "product_id"
            )
        )

        action = str(
            data.get(
                "action",
                ""
            )
        ).lower().strip()

        quantity = safe_int(
            data.get(
                "quantity",
                0
            )
        )

        reason = str(
            data.get(
                "reason",
                ""
            )
        ).strip()

        discount_percent = safe_float(
            data.get(
                "discount_percent",
                0
            )
        )

        # ----------------------------------------------------
        # VALIDATE ACTION
        # ----------------------------------------------------

        valid_actions = [
            "sell",
            "damaged",
            "restock",
            "adjustment"
        ]

        if action not in valid_actions:

            return jsonify({

                "error":
                    "Invalid inventory action. "
                    "Use sell, damaged, restock or adjustment."

            }), 400

        if quantity <= 0:

            return jsonify({

                "error":
                    "Quantity must be greater than 0"

            }), 400

        # ----------------------------------------------------
        # READ CORRECT FILE
        #
        # IMPORTANT:
        # This MUST be CSV_FILE, not SALES_FILE.
        # ----------------------------------------------------

        inventory = read_inventory()

        # ----------------------------------------------------
        # FIND PRODUCT
        # ----------------------------------------------------

        product = None

        for item in inventory:

            if safe_int(
                item["product_id"]
            ) == product_id:

                product = item

                break

        if product is None:

            return jsonify({

                "error":
                    "Product not found"

            }), 404

        # ----------------------------------------------------
        # CURRENT VALUES
        # ----------------------------------------------------

        current_stock = safe_int(
            product.get(
                "current_stock"
            )
        )

        reorder_level = safe_int(
            product.get(
                "reorder_level"
            )
        )

        unit_price = safe_float(
            product.get(
                "unit_price"
            )
        )

        # ----------------------------------------------------
        # CALCULATE STOCK CHANGE
        # ----------------------------------------------------

        if action == "sell":

            quantity_change = -quantity

        elif action == "damaged":

            quantity_change = -quantity

        elif action == "restock":

            quantity_change = quantity

        elif action == "adjustment":

            quantity_change = quantity

        # ----------------------------------------------------
        # NEW STOCK
        # ----------------------------------------------------

        new_stock = (
            current_stock
            + quantity_change
        )

        # ----------------------------------------------------
        # PREVENT NEGATIVE STOCK
        # ----------------------------------------------------

        if new_stock < 0:

            return jsonify({

                "error":
                    f"Insufficient stock. "
                    f"Current stock is {current_stock}."

            }), 400

        # ----------------------------------------------------
        # UPDATE INVENTORY
        # ----------------------------------------------------

        new_inventory_value = (
            new_stock
            * unit_price
        )

        new_status = calculate_inventory_status(
            new_stock,
            reorder_level
        )

        product.update({

            "current_stock":
                str(new_stock),

            "inventory_value":
                str(
                    round(
                        new_inventory_value,
                        2
                    )
                ),

            "status":
                new_status
        })

        # ----------------------------------------------------
        # SAVE INVENTORY CSV
        # ----------------------------------------------------

        write_inventory(
            inventory
        )

        # ====================================================
        # SELL
        # → SALES CSV
        # ====================================================

        sale_transaction_id = None
        revenue = 0

        if action == "sell":

            (
                sale_transaction_id,
                revenue
            ) = append_sale(

                product=product,

                quantity=quantity,

                unit_price=unit_price,

                discount_percent=
                    discount_percent
            )

        # ====================================================
        # ALL ACTIONS
        # → INVENTORY TRANSACTIONS CSV
        # ====================================================

        inventory_transaction_id = add_inventory_transaction(
            product=product,
            action=action,
            quantity=quantity,
            quantity_change=quantity_change,
            reason=reason or (
                "New Sale" if action == "sell" else action.capitalize()
            )
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "message":
                f"{action.capitalize()} successful",

            "action":
                action,

            "inventory_transaction_id":
                inventory_transaction_id,

            "sale_transaction_id":
                sale_transaction_id,

            "revenue":
                round(
                    revenue,
                    2
                ),

            "product": {

                "product_id":
                    safe_int(
                        product["product_id"]
                    ),

                "product":
                    product["product"],

                "category":
                    product["category"],

                "current_stock":
                    new_stock,

                "reorder_level":
                    reorder_level,

                "unit_price":
                    unit_price,

                "inventory_value":
                    round(
                        new_inventory_value,
                        2
                    ),

                "status":
                    new_status,

                "img_url":
                    product.get(
                        "img_url",
                        ""
                    )
            }

        }), 200

    except Exception as error:

        print(
            "INVENTORY ACTION ERROR:",
            error
        )

        return jsonify({

            "error":
                str(error)

        }), 500


@app.route(
    "/api/sales/create",
    methods=["POST", "OPTIONS"]
)
def create_sale():

    if request.method == "OPTIONS":
        return "", 200

    try:

        data = (
            request.get_json(force=True)
            or {}
        )

        items = data.get("items", [])

        # ----------------------------------------------------
        # VALIDATE ITEMS
        # ----------------------------------------------------

        if not items or not isinstance(items, list):

            return jsonify({
                "error": "At least one product is required"
            }), 400

        # ----------------------------------------------------
        # READ INVENTORY
        # ----------------------------------------------------

        inventory = read_inventory()

        # ----------------------------------------------------
        # VALIDATE ALL PRODUCTS FIRST
        # ----------------------------------------------------
        # Important:
        # We validate everything BEFORE changing inventory.
        # This prevents a half-completed transaction.
        # ----------------------------------------------------

        sale_items = []

        for item in items:

            product_id = safe_int(
                item.get("product_id")
            )

            quantity = safe_int(
                item.get("quantity", 0)
            )

            discount_percent = safe_float(
                item.get(
                    "discount_percent",
                    0
                )
            )

            if product_id is None:

                return jsonify({
                    "error": "Invalid product_id"
                }), 400

            if quantity <= 0:

                return jsonify({
                    "error":
                        "Quantity must be greater than 0"
                }), 400

            # Find product
            product = None

            for inv_item in inventory:

                if safe_int(
                    inv_item["product_id"]
                ) == product_id:

                    product = inv_item
                    break

            if product is None:

                return jsonify({
                    "error":
                        f"Product {product_id} not found"
                }), 404

            current_stock = safe_int(
                product.get("current_stock")
            )

            if quantity > current_stock:

                return jsonify({
                    "error":
                        f"Insufficient stock for "
                        f"{product.get('product')}. "
                        f"Available: {current_stock}"
                }), 400

            unit_price = safe_float(
                product.get("unit_price")
            )

            # Calculate revenue
            gross_amount = (
                quantity * unit_price
            )

            discount_amount = (
                gross_amount
                * discount_percent
                / 100
            )

            revenue = (
                gross_amount
                - discount_amount
            )

            sale_items.append({

                "product": product,

                "product_id": product_id,

                "quantity": quantity,

                "unit_price": unit_price,

                "discount_percent":
                    discount_percent,

                "revenue": revenue
            })

        # ----------------------------------------------------
        # CREATE ONE TRANSACTION ID
        # ----------------------------------------------------

        import uuid

        transaction_id = (
            "TXN-"
            + uuid.uuid4().hex[:8].upper()
        )

        total_revenue = 0

        # ----------------------------------------------------
        # PROCESS EACH PRODUCT
        # ----------------------------------------------------

        for item in sale_items:

            product = item["product"]

            quantity = item["quantity"]

            quantity_change = -quantity

            current_stock = safe_int(
                product.get("current_stock")
            )

            reorder_level = safe_int(
                product.get("reorder_level")
            )

            unit_price = item["unit_price"]

            new_stock = (
                current_stock
                + quantity_change
            )

            new_inventory_value = (
                new_stock
                * unit_price
            )

            new_status = calculate_inventory_status(
                new_stock,
                reorder_level
            )

            # ----------------------------------------------
            # UPDATE INVENTORY
            # ----------------------------------------------

            product.update({

                "current_stock":
                    str(new_stock),

                "inventory_value":
                    str(
                        round(
                            new_inventory_value,
                            2
                        )
                    ),

                "status":
                    new_status
            })

            # ----------------------------------------------
            # ADD SALES RECORD
            # ----------------------------------------------

            append_sale(

                product=product,
                quantity=quantity,
                unit_price=unit_price,
                discount_percent=
                    item["discount_percent"],
                transaction_id=
                    transaction_id
            )

            # ----------------------------------------------
            # ADD INVENTORY TRANSACTION
            # ----------------------------------------------

            add_inventory_transaction(
                product=product, action="sell", quantity=quantity, quantity_change= quantity_change, reason="New Sale", transaction_id= transaction_id
            )

            total_revenue += item["revenue"]

        # ----------------------------------------------------
        # SAVE INVENTORY ONCE
        # ----------------------------------------------------

        write_inventory(
            inventory
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "message":
                "Sale completed successfully",

            "transaction_id":
                transaction_id,

            "items": [

                {
                    "product_id":
                        item["product_id"],

                    "product":
                        item["product"]["product"],

                    "quantity":
                        item["quantity"],

                    "unit_price":
                        item["unit_price"],

                    "revenue":
                        round(
                            item["revenue"],
                            2
                        )
                }

                for item in sale_items
            ],

            "total_revenue":
                round(
                    total_revenue,
                    2
                )

        }), 200

    except Exception as error:

        print(
            "CREATE SALE ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "error":
                str(error)

        }), 500






@app.route("/api/recommendations/apriori", methods=["GET"])
def apriori_recommendations():
    try:
        # Product IDs currently in the shopping basket
        basket_ids = request.args.get("product_ids", "").strip()

        if not basket_ids:
            return jsonify({
                "success": True,
                "recommendations": [],
                "message": "Add products to the basket to get recommendations."
            }), 200

        basket_ids = {
            item.strip()
            for item in basket_ids.split(",")
            if item.strip()
        }

        sales = read_sales()

        # Group products belonging to the same sale transaction
        transactions = {}

        for sale in sales:
            transaction_id = str(
                sale.get("transaction_id", "")
            ).strip()

            product_id = str(
                sale.get("product_id", "")
            ).strip()

            if transaction_id and product_id:
                transactions.setdefault(transaction_id, set()).add(
                    product_id
                )

        transaction_list = [
            list(products)
            for products in transactions.values()
            if products
        ]

        # Apriori needs historical transactions to discover patterns
        if len(transaction_list) < 2:
            return jsonify({
                "success": True,
                "recommendations": [],
                "message": "Not enough sales history to learn product associations yet."
            }), 200

        encoder = TransactionEncoder()
        encoded_array = encoder.fit(transaction_list).transform(
            transaction_list
        )

        basket_df = pd.DataFrame(
            encoded_array,
            columns=encoder.columns_
        )

        # Lower support helps with smaller project datasets
        frequent_itemsets = apriori(
            basket_df,
            min_support=0.01,
            use_colnames=True
        )

        if frequent_itemsets.empty:
            return jsonify({
                "success": True,
                "recommendations": [],
                "message": "No frequent product combinations found yet."
            }), 200

        rules = association_rules(
            frequent_itemsets,
            metric="confidence",
            min_threshold=0.1
        )

        if rules.empty:
            return jsonify({
                "success": True,
                "recommendations": [],
                "message": "No product association rules found yet."
            }), 200

        # Keep rules whose antecedent overlaps with the current basket
        recommendations = {}

        for _, rule in rules.iterrows():
            antecedents = {
                str(product) for product in rule["antecedents"]
            }
            consequents = {
                str(product) for product in rule["consequents"]
            }

            if not antecedents.issubset(basket_ids):
                continue

            for product_id in consequents:
                if product_id in basket_ids:
                    continue

                current = recommendations.get(product_id)

                score = {
                    "product_id": product_id,
                    "confidence": round(float(rule["confidence"]), 4),
                    "support": round(float(rule["support"]), 4),
                    "lift": round(float(rule["lift"]), 4)
                }

                if current is None or score["confidence"] > current["confidence"]:
                    recommendations[product_id] = score

        # Match recommendations to actual products in the inventory
        inventory = read_inventory()

        inventory_by_id = {
            str(item.get("product_id", item.get("id", ""))).strip(): item
            for item in inventory
        }

        results = []

        for product_id, metrics in recommendations.items():
            product = inventory_by_id.get(product_id)

            if not product:
                continue

            # Exclude products that are out of stock
            try:
                stock = float(
                    product.get("current_stock", product.get("stock", 0)) or 0
                )
            except (TypeError, ValueError):
                stock = 0

            if stock <= 0:
                continue

            results.append({
                "id": product_id,
                "product": product.get("product", product.get("name", "")),
                "category": product.get("category", ""),
                "unit_price": float(
                    product.get("unit_price", product.get("price", 0)) or 0
                ),
                "current_stock": stock,
                "confidence": metrics["confidence"],
                "support": metrics["support"],
                "lift": metrics["lift"]
            })

        results.sort(
            key=lambda item: (
                item["lift"],
                item["confidence"],
                item["support"]
            ),
            reverse=True
        )

        return jsonify({
            "success": True,
            "recommendations": results[:5],
            "transaction_count": len(transaction_list)
        }), 200

    except Exception as error:
        app.logger.exception("Apriori recommendation error")
        return jsonify({
            "success": False,
            "message": "Unable to generate product recommendations."
        }), 500

# ============================================================
# DASHBOARD
# ============================================================

@app.route(
    "/api/dashboard",
    methods=["GET"]
)
def dashboard():

    try:

        inventory = read_inventory()
        sales = read_sales()

        # ----------------------------------------------------
        # LOW STOCK
        # ----------------------------------------------------

        low_stock_products = []

        for item in inventory:

            stock = safe_int(
                item["current_stock"]
            )

            reorder = safe_int(
                item["reorder_level"]
            )

            if stock <= reorder:

                low_stock_products.append({

                    "product":
                        item["product"],

                    "product_id":
                        safe_int(
                            item["product_id"]
                        ),

                    "stock":
                        stock,

                    "reorder_level":
                        reorder
                })

        # ----------------------------------------------------
        # INVENTORY VALUE
        # ----------------------------------------------------

        total_inventory_value = sum(

            safe_float(
                item["inventory_value"]
            )

            for item in inventory
        )

        # ----------------------------------------------------
        # TOTAL SALES
        # ----------------------------------------------------

        total_sales = sum(

            safe_float(
                sale["revenue"]
            )

            for sale in sales
        )

        # ----------------------------------------------------
        # TOTAL UNITS SOLD
        # ----------------------------------------------------

        total_units_sold = sum(

            safe_float(
                sale["quantity"]
            )

            for sale in sales
        )

        # ----------------------------------------------------
        # CATEGORY STOCK
        # ----------------------------------------------------

        category_stock = {}

        for item in inventory:

            category = item.get(
                "category",
                "Unknown"
            )

            stock = safe_int(
                item.get(
                    "current_stock"
                )
            )

            category_stock[category] = (
                category_stock.get(
                    category,
                    0
                )
                + stock
            )

        inventory_by_category = [

            {
                "category":
                    category,

                "stock":
                    stock
            }

            for category, stock
            in category_stock.items()
        ]

        # ----------------------------------------------------
        # SALES BY PRODUCT
        # ----------------------------------------------------

        product_sales = {}

        for sale in sales:

            product_name = sale.get(
                "product",
                "Unknown"
            )

            revenue = safe_float(
                sale.get(
                    "revenue"
                )
            )

            product_sales[
                product_name
            ] = (

                product_sales.get(
                    product_name,
                    0
                )
                + revenue
            )

        sales_by_product = [

            {
                "product":
                    product,

                "revenue":
                    round(
                        revenue,
                        2
                    )
            }

            for product, revenue
            in product_sales.items()
        ]

        # ----------------------------------------------------
        # SALES BY DATE
        # ----------------------------------------------------

        daily_sales = {}

        for sale in sales:

            sale_date = sale.get(
                "date",
                ""
            )

            revenue = safe_float(
                sale.get(
                    "revenue"
                )
            )

            daily_sales[sale_date] = (

                daily_sales.get(
                    sale_date,
                    0
                )
                + revenue
            )

        sales_by_date = [

            {
                "date":
                    date,

                "revenue":
                    round(
                        revenue,
                        2
                    )
            }

            for date, revenue
            in sorted(
                daily_sales.items()
            )
        ]

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "total_products":
                len(inventory),

            "low_stock":
                len(
                    low_stock_products
                ),

            "total_inventory_value":
                round(
                    total_inventory_value,
                    2
                ),

            "total_sales":
                round(
                    total_sales,
                    2
                ),

            "total_units_sold":
                round(
                    total_units_sold,
                    2
                ),

            "total_transactions":
                len(sales),

            "low_stock_products":
                low_stock_products,

            "inventory_by_category":
                inventory_by_category,

            "sales_by_product":
                sales_by_product,

            "sales_by_date":
                sales_by_date

        })

    except Exception as error:

        return jsonify({

            "error":
                str(error)

        }), 500


# ============================================================
# RANDOM FOREST REVENUE PREDICTION
# ============================================================

@app.route(
    "/predict",
    methods=["POST", "OPTIONS"]
)
def predict():

    if request.method == "OPTIONS":

        return jsonify({
            "status":
                "ok"
        }), 200

    try:
        model, le_product, le_category = get_rf_model()
        if model is None:
            return jsonify({"error": "Random Forest model is not loaded"}), 500

        # if model is None:

        #     return jsonify({

        #         "error":
        #             "Random Forest model is not loaded"

        #     }), 500

        data = (
            request.get_json(
                force=True,
                silent=True
            )
            or {}
        )

        date = pd.to_datetime(
            data.get(
                "date",
                "2026-09-01"
            )
        )

        product_name = str(
            data.get(
                "product",
                ""
            )
        )

        category_name = str(
            data.get(
                "category",
                ""
            )
        )

        # ----------------------------------------------------
        # PRODUCT ENCODING
        # ----------------------------------------------------

        try:

            p_enc = le_product.transform(
                [product_name]
            )[0]

        except Exception:

            p_enc = 0

        # ----------------------------------------------------
        # CATEGORY ENCODING
        # ----------------------------------------------------

        try:

            c_enc = le_category.transform(
                [category_name]
            )[0]

        except Exception:

            c_enc = 0

        # ----------------------------------------------------
        # INPUT
        # ----------------------------------------------------

        input_data = pd.DataFrame([{

            "product_id":
                safe_int(
                    data.get(
                        "product_id",
                        1
                    )
                ),

            "product_encoded":
                p_enc,

            "category_encoded":
                c_enc,

            "quantity":
                safe_int(
                    data.get(
                        "quantity",
                        5
                    )
                ),

            "unit_price":
                safe_float(
                    data.get(
                        "unit_price",
                        100
                    )
                ),

            "discount_percent":
                safe_float(
                    data.get(
                        "discount_percent",
                        0
                    )
                ),

            "month":
                date.month,

            "day":
                date.day,

            "dayofweek":
                date.dayofweek

        }])

        prediction = model.predict(
            input_data
        )[0]

        return jsonify({

            "predicted_revenue":
                float(prediction)

        }), 200

    except Exception as error:

        return jsonify({

            "error":
                str(error)

        }), 500


# ============================================================
# CHRONOS-2 7-DAY DEMAND FORECAST
# ============================================================

@app.route(
    "/api/forecast",
    methods=["GET"]
)
def forecast():

    try:

        # ----------------------------------------------------
        # CHECK CHRONOS
        # ----------------------------------------------------

        chronos_pipeline = get_chronos_pipeline()
        if chronos_pipeline is None:
            return jsonify({"error": "Chronos-2 model is not loaded"}), 500
        # if chronos_pipeline is None:

        #     return jsonify({

        #         "error":
        #             "Chronos-2 model is not loaded"

        #     }), 500

        # ----------------------------------------------------
        # CHECK DATASET
        # ----------------------------------------------------

        forecast_records = mongo_api("GET", "forecast-history") or []

        if not forecast_records:
            return jsonify({
                "error": "Forecast history is empty. Import complete_daily_sales.csv into MongoDB first."
            }), 404

        # ----------------------------------------------------
        # LOAD DATA FROM MONGODB
        # ----------------------------------------------------

        df = pd.DataFrame(forecast_records)

        if df.empty:
            return jsonify({
                "error": "Forecast dataset is empty"
            }), 400

        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["product_id"] = df["product_id"].astype(str)
        df["quantity"] = pd.to_numeric(
            df["quantity"], errors="coerce"
        ).fillna(0)
        df = df.dropna(subset=["date"])

        if df.empty:

            return jsonify({

                "error":
                    "Forecast dataset is empty"

            }), 400

        # ----------------------------------------------------
        # REQUIRED COLUMNS
        # ----------------------------------------------------

        required_columns = [
            "date",
            "product_id",
            "product",
            "category",
            "quantity"
        ]

        missing_columns = [

            column
            for column in required_columns

            if column not in df.columns
        ]

        if missing_columns:

            return jsonify({

                "error":
                    "Missing forecast columns",

                "missing_columns":
                    missing_columns

            }), 400

        # ----------------------------------------------------
        # PREPARE DATA
        # ----------------------------------------------------

        df["date"] = pd.to_datetime(
            df["date"]
        )

        df["quantity"] = pd.to_numeric(
            df["quantity"],
            errors="coerce"
        ).fillna(0)

        df = df.sort_values(
            [
                "product_id",
                "date"
            ]
        ).reset_index(
            drop=True
        )

        # ----------------------------------------------------
        # PRODUCT FILTER
        # ----------------------------------------------------

        requested_product = request.args.get(
            "product_id"
        )

        if requested_product:

            try:

                product_ids = [
                    int(
                        requested_product
                    )
                ]

            except ValueError:

                return jsonify({

                    "error":
                        "product_id must be an integer"

                }), 400

        else:

            product_ids = (
                df["product_id"]
                .astype(str)
                .unique()
                .tolist()
            )

        # ----------------------------------------------------
        # INVENTORY DATA
        # ----------------------------------------------------

        inventory = read_inventory()

        inventory_lookup = {}

        for item in inventory:

            inventory_lookup[
                safe_int(item["product_id"])
            ] = item

        # ----------------------------------------------------
        # FORECAST
        # ----------------------------------------------------

        all_forecasts = []

        for product_id in product_ids:

            product_df = df[
                df["product_id"].astype(str)
                == str(product_id)
            ].copy()

            if product_df.empty:

                continue

            product_df = (
                product_df
                .sort_values("date")
                .reset_index(drop=True)
            )

            # ------------------------------------------------
            # CHRONOS INPUT
            # ------------------------------------------------

            context_df = product_df[
                [
                    "date",
                    "quantity"
                ]
            ].copy()

            context_df = context_df.rename(

                columns={

                    "date":
                        "timestamp",

                    "quantity":
                        "target"
                }
            )

            context_df["item_id"] = str(
                product_id
            )

            context_df = context_df[
                [
                    "item_id",
                    "timestamp",
                    "target"
                ]
            ]

            # ------------------------------------------------
            # RUN CHRONOS
            # ------------------------------------------------

            forecast_df = (
                chronos_pipeline.predict_df(

                    context_df,

                    prediction_length=7,

                    quantile_levels=[
                        0.1,
                        0.5,
                        0.9
                    ],

                    id_column="item_id",

                    timestamp_column="timestamp",

                    target="target"
                )
            )

            # ------------------------------------------------
            # FIND MEDIAN
            # ------------------------------------------------

            median_column = "0.5"

            if (
                median_column
                not in forecast_df.columns
            ):

                possible_columns = [

                    column

                    for column
                    in forecast_df.columns

                    if (
                        "0.5"
                        in str(column)
                        or
                        "0.50"
                        in str(column)
                    )
                ]

                if not possible_columns:

                    return jsonify({

                        "error":
                            "Chronos median forecast column not found",

                        "columns":
                            list(
                                forecast_df.columns
                            )

                    }), 500

                median_column = (
                    possible_columns[0]
                )

            predictions = (
                forecast_df[
                    median_column
                ]
                .values
            )

            predictions = [

                max(
                    0,
                    round(
                        float(value),
                        2
                    )
                )

                for value
                in predictions
            ]

            # ------------------------------------------------
            # PRODUCT INFORMATION
            # ------------------------------------------------

            product_name = str(

                product_df[
                    "product"
                ].iloc[0]
            )

            category = str(

                product_df[
                    "category"
                ].iloc[0]
            )

            # ------------------------------------------------
            # CURRENT INVENTORY
            # ------------------------------------------------

            inventory_item = (
                inventory_lookup.get(
                    safe_int(
                        product_id
                    )
                )
            )

            current_stock = None
            reorder_level = None
            status = None

            if inventory_item:

                current_stock = safe_int(
                    inventory_item[
                        "current_stock"
                    ]
                )

                reorder_level = safe_int(
                    inventory_item[
                        "reorder_level"
                    ]
                )

                status = inventory_item.get(
                    "status",
                    ""
                )

            # ------------------------------------------------
            # ADD FORECAST RECORDS
            # ------------------------------------------------

            last_date = (
                product_df[
                    "date"
                ].max()
            )

            for index, prediction in enumerate(
                predictions
            ):

                forecast_start_date = (pd.Timestamp.now().normalize()
                    + pd.Timedelta(days=1)
                )

                forecast_date = (
                    forecast_start_date
                    + pd.Timedelta(days=index)
                )

                all_forecasts.append({

                    "date":
                        forecast_date.strftime(
                            "%Y-%m-%d"
                        ),

                    "product_id":
                        safe_int(
                            product_id
                        ),

                    "product":
                        product_name,

                    "category":
                        category,

                    "predicted_demand":
                        prediction,

                    "current_stock":
                        current_stock,

                    "reorder_level":
                        reorder_level,

                    "status":
                        status
                })

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------
        print("Latest sales date:", df["date"].max())
        print("Earliest sales date:", df["date"].min())
        return jsonify({

            "model":
                "Amazon Chronos-2",

            "forecast_days":
                7,

            "forecasts":
                all_forecasts

        }), 200

    except Exception as error:

        print(
            "FORECAST ERROR:",
            error
        )

        return jsonify({

            "error":
                str(error)

        }), 500

# ============================================================
# AI INVENTORY INTELLIGENCE
# ============================================================

@app.route(
    "/api/ai/inventory-query",
    methods=["POST", "OPTIONS"]
)
def ai_inventory_query():

    if request.method == "OPTIONS":
        return "", 200

    try:

        # ----------------------------------------------------
        # CHECK AI CONFIGURATION
        # ----------------------------------------------------

        if client is None:

            return jsonify({
                "error":
                    "AI assistant is not configured. "
                    "Please set GEMINI_API_KEY."
            }), 500

        # ----------------------------------------------------
        # GET USER QUESTION
        # ----------------------------------------------------

        data = request.get_json(force=True) or {}

        question = str(
            data.get("question", "")
        ).strip()

        if not question:

            return jsonify({
                "error":
                    "Please enter a question."
            }), 400

        # ----------------------------------------------------
        # LOAD INVENTORY
        # ----------------------------------------------------

        inventory = read_inventory()

        if not inventory:

            return jsonify({
                "error":
                    "Inventory data is empty."
            }), 404

        # ----------------------------------------------------
        # LOAD SALES
        # ----------------------------------------------------

        sales = read_sales()

        # ----------------------------------------------------
        # PREPARE INVENTORY ANALYTICS
        # ----------------------------------------------------

        inventory_context = []

        for item in inventory:

            stock = safe_int(
                item.get("current_stock", 0)
            )

            reorder_level = safe_int(
                item.get("reorder_level", 0)
            )

            unit_price = safe_float(
                item.get("unit_price", 0)
            )

            inventory_context.append({

                "product_id":
                    safe_int(
                        item.get("product_id")
                    ),

                "product":
                    item.get("product", ""),

                "category":
                    item.get("category", ""),

                "current_stock":
                    stock,

                "reorder_level":
                    reorder_level,

                "unit_price":
                    unit_price,

                "inventory_value":
                    round(
                        stock * unit_price,
                        2
                    ),

                "stock_status":
                    (
                        "LOW"
                        if stock <= reorder_level
                        else "HEALTHY"
                    )
            })

        # ----------------------------------------------------
        # SALES ANALYTICS
        # ----------------------------------------------------

        sales_summary = {}

        for sale in sales:

            product_id = safe_int(
                sale.get("product_id")
            )

            quantity = safe_float(
                sale.get("quantity", 0)
            )

            revenue = safe_float(
                sale.get("revenue", 0)
            )

            if product_id not in sales_summary:

                sales_summary[product_id] = {
                    "units_sold": 0,
                    "revenue": 0
                }

            sales_summary[
                product_id
            ]["units_sold"] += quantity

            sales_summary[
                product_id
            ]["revenue"] += revenue

        # ----------------------------------------------------
        # COMBINE DATA
        # ----------------------------------------------------

        for item in inventory_context:

            product_id = item["product_id"]

            sales_info = sales_summary.get(
                product_id,
                {
                    "units_sold": 0,
                    "revenue": 0
                }
            )

            item["total_units_sold"] = round(
                sales_info["units_sold"],
                2
            )

            item["total_revenue"] = round(
                sales_info["revenue"],
                2
            )

        # ----------------------------------------------------
        # SYSTEM INSTRUCTIONS
        # ----------------------------------------------------

        system_prompt = """
You are the AI Inventory Intelligence Assistant
for an Intelligent Retail Analytics and Inventory
Optimization System.

Your job is to analyze the supplied REAL inventory
and sales data and answer the user's question.

IMPORTANT RULES:

1. Only use information present in the supplied data.
2. Never invent products, quantities, prices,
   forecasts, or business facts.
3. If the requested information is not available,
   clearly say that it is not available.
4. Give practical inventory recommendations when
   the data supports them.
5. Explain WHY a recommendation was made.
6. Keep answers concise but useful.
7. Use the product names from the data.
8. When discussing low stock, compare current_stock
   with reorder_level.
9. Do not claim that an LLM prediction is a statistical
   forecast.
10. This is a retail inventory decision-support system,
    not an autonomous purchasing system.

Format answers clearly using short paragraphs,
bullet points, and tables when useful.
"""

        # ----------------------------------------------------
        # DATA CONTEXT
        # ----------------------------------------------------

        context = {
            "inventory": inventory_context,
            "total_products": len(inventory_context),
            "total_sales_records": len(sales),
            "sales_summary": sales_summary
        }

        # ----------------------------------------------------
        # GEMINI REQUEST
        # ----------------------------------------------------

        response = client.models.generate_content(

            model="gemini-3.1-flash-lite",

            contents=(
                "RETAIL DATA:\n"
                + str(context)
                + "\n\nUSER QUESTION:\n"
                + question
            ),

            config=types.GenerateContentConfig(

                system_instruction=system_prompt,

                max_output_tokens=600,

                temperature=0.2
            )
        )

        answer = response.text

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "question":
                question,

            "answer":
                answer,

            "model":
                "Gemini 2.5 Flash"

        }), 200

    except Exception as error:

        print(
            "AI INVENTORY ERROR:",
            error
        )

        return jsonify({

            "success": False,

            "error":
                str(error)

        }), 500




@app.route("/api/recommendations/apriori/debug", methods=["GET"])
def debug_apriori():
    sales = read_sales()
    transactions = {}

    for sale in sales:
        tid = str(sale.get("transaction_id", "")).strip()
        pid = str(sale.get("product_id", "")).strip()

        if tid and pid:
            transactions.setdefault(tid, set()).add(pid)

    sizes = {}
    for products in transactions.values():
        count = len(products)
        sizes[count] = sizes.get(count, 0) + 1

    return jsonify({
        "sales_rows": len(sales),
        "unique_transactions": len(transactions),
        "transactions_by_product_count": {
            str(k): v for k, v in sorted(sizes.items())
        },
        "multi_product_transactions": sum(
            1 for products in transactions.values()
            if len(products) >= 2
        ),
        "sample_multi_product_transactions": [
            {
                "transaction_id": tid,
                "product_ids": sorted(products)
            }
            for tid, products in transactions.items()
            if len(products) >= 2
        ][:10]
    })



# ============================================================
# RECOMMENDATION SERVICE PROXY
# Forwards requests from port 5000 to port 8000
# ============================================================

def forward_recommendation_request(endpoint, params=None):
    """Forward a request to the separate recommendation service."""
    try:
        url = f"{RECOMMENDATION_API_URL}{endpoint}"

        response = requests.get(
            url,
            params=params,
            timeout=30
        )

        return app.response_class(
            response=response.content,
            status=response.status_code,
            content_type=response.headers.get(
                "Content-Type",
                "application/json"
            )
        )

    except requests.RequestException:
        app.logger.exception(
            "Recommendation service connection failed"
        )

        return jsonify({
            "success": False,
            "error": "Recommendation service is unavailable",
            "service_url": RECOMMENDATION_API_URL
        }), 502


@app.route(
    "/api/recommendations/product/<product_id>",
    methods=["GET"]
)
def proxy_similar_products(product_id):
    """Get similar products from the recommendation service."""

    endpoint = (
        "/recommend/product/"
        + quote(product_id, safe="")
    )

    params = {
        "n": request.args.get("n", "5"),
        "method": request.args.get("method", "ii_cf")
    }

    return forward_recommendation_request(
        endpoint,
        params=params
    )


@app.route(
    "/api/recommendations/also-bought/<product_id>",
    methods=["GET"]
)
def proxy_also_bought(product_id):
    """Get customers-also-bought recommendations."""

    endpoint = (
        "/recommend/also-bought/"
        + quote(product_id, safe="")
    )

    params = {
        "n": request.args.get("n", "5")
    }

    return forward_recommendation_request(
        endpoint,
        params=params
    )



# ============================================================
# HISTORICAL DAILY DEMAND FOR FORECAST GRAPH
# ============================================================

@app.route("/api/forecast/history", methods=["GET"])
def forecast_history():
    try:
        product_id = request.args.get("product_id")

        if not product_id:
            return jsonify({
                "error": "product_id is required"
            }), 400

        forecast_records = mongo_api("GET", "forecast-history") or []
        if not forecast_records:
            return jsonify({
                "error": "Forecast dataset not found"
            }), 404

        df = pd.DataFrame(forecast_records)

        required_columns = [
            "date", "product_id", "quantity"
        ]

        missing = [
            col for col in required_columns
            if col not in df.columns
        ]

        if missing:
            return jsonify({
                "error": "Missing required columns",
                "missing_columns": missing
            }), 400

        df["product_id"] = (
            df["product_id"].astype(str).str.strip()
        )

        df = df[
            df["product_id"] == str(product_id).strip()
        ].copy()

        if df.empty:
            return jsonify({"history": []}), 200

        df["date"] = pd.to_datetime(
            df["date"], errors="coerce"
        )

        df["quantity"] = pd.to_numeric(
            df["quantity"], errors="coerce"
        ).fillna(0)

        df = df.dropna(subset=["date"])

        # Combine multiple records for the same day.
        daily = (
            df.groupby(df["date"].dt.strftime("%Y-%m-%d"))
            ["quantity"]
            .sum()
            .reset_index()
        )

        daily.columns = ["date", "actual_demand"]
        daily = daily.sort_values("date").tail(30)

        history = [
            {
                "date": row["date"],
                "actual_demand": float(row["actual_demand"])
            }
            for _, row in daily.iterrows()
        ]

        return jsonify({"history": history}), 200

    except Exception as error:
        app.logger.exception("Historical demand error")
        return jsonify({"error": str(error)}), 500



# ============================================================
# PURCHASE ORDER MANAGEMENT
# Requires existing: app, DATA_DIR, forecast, read_inventory,
# write_inventory, safe_int, safe_float,
# calculate_inventory_status, add_inventory_transaction,
# generate_transaction_id
# ============================================================

import csv
import os
import json
import math
from datetime import datetime
from flask import request, jsonify


# ---------------- CONFIGURATION ----------------

# ---------------- MONGODB PURCHASE ORDER HELPERS ----------------

def initialize_purchase_orders():
    # Retained for compatibility with existing purchase-order code.
    return None


def read_purchase_orders():
    orders = mongo_api("GET", "purchase-orders") or []

    for order in orders:
        if not isinstance(order.get("items"), list):
            order["items"] = []
        order["total_cost"] = safe_float(order.get("total_cost"))

    return orders


def write_purchase_orders(orders):
    mongo_api("PUT", "purchase-orders", orders)


# ---------------- FORECAST-BASED RECOMMENDATIONS ----------------

@app.route(
    "/api/purchase-orders/recommendations",
    methods=["GET"]
)
def purchase_order_recommendations():
    try:
        # Reuse your existing forecast endpoint function.
        forecast_result = forecast()

        if isinstance(forecast_result, tuple):
            response = forecast_result[0]
            status_code = forecast_result[1]
        else:
            response = forecast_result
            status_code = getattr(
                response, "status_code", 200
            )

        if status_code >= 400:
            details = (
                response.get_json(silent=True)
                if hasattr(response, "get_json")
                else str(response)
            )

            return jsonify({
                "error": "Unable to retrieve demand forecasts",
                "details": details
            }), status_code

        if hasattr(response, "get_json"):
            forecast_data = response.get_json(silent=True) or {}
        elif isinstance(response, dict):
            forecast_data = response
        else:
            return jsonify({
                "error": "Unexpected response from forecast service"
            }), 500

        forecast_rows = forecast_data.get("forecasts", [])

        if not isinstance(forecast_rows, list):
            return jsonify({
                "error": "Forecast data must contain a forecasts list"
            }), 500

        demand_by_product = {}

        for row in forecast_rows:
            product_id = safe_int(
                row.get("product_id"), -1
            )

            if product_id < 0:
                continue

            demand = max(
                0,
                safe_float(row.get("predicted_demand"))
            )

            demand_by_product[product_id] = (
                demand_by_product.get(product_id, 0) + demand
            )

        recommendations = []

        for product in read_inventory():
            product_id = safe_int(
                product.get("product_id"), -1
            )
            stock = safe_int(product.get("current_stock"))
            reorder_level = safe_int(
                product.get("reorder_level")
            )
            unit_price = safe_float(
                product.get("unit_price")
            )

            # Do not invent a zero forecast for missing products.
            if product_id not in demand_by_product:
                continue

            forecast_demand = demand_by_product[product_id]

            # Target = forecast demand + reorder-level buffer.
            target_stock = math.ceil(
                forecast_demand + reorder_level
            )

            suggested_quantity = max(
                0,
                target_stock - stock
            )

            if suggested_quantity <= 0:
                continue

            recommendations.append({
                "product_id": product_id,
                "product": product.get("product", ""),
                "category": product.get("category", ""),
                "current_stock": stock,
                "reorder_level": reorder_level,
                "forecast_demand_7d": round(
                    forecast_demand, 2
                ),
                "suggested_quantity": suggested_quantity,
                "unit_price": unit_price,
                "estimated_cost": round(
                    suggested_quantity * unit_price, 2
                ),
                "reason": (
                    f"Current stock is {stock}; target stock is "
                    f"{target_stock}, based on forecast demand "
                    f"and the reorder-level buffer."
                )
            })

        recommendations.sort(
            key=lambda item: item["estimated_cost"],
            reverse=True
        )

        return jsonify({
            "forecast_model": forecast_data.get(
                "model", "Existing forecast service"
            ),
            "recommendations": recommendations
        }), 200

    except Exception as error:
        app.logger.exception(
            "Purchase-order recommendation failed"
        )
        return jsonify({"error": str(error)}), 500


# ---------------- LIST AND CREATE PURCHASE ORDERS ----------------

@app.route(
    "/api/purchase-orders",
    methods=["GET", "POST"]
)
def purchase_orders():
    if request.method == "GET":
        return jsonify({
            "purchase_orders": read_purchase_orders()
        }), 200

    try:
        data = request.get_json(silent=True) or {}

        supplier_name = str(
            data.get("supplier_name", "")
        ).strip()

        if not supplier_name:
            return jsonify({
                "error": "Supplier name is required"
            }), 400

        submitted_items = data.get("items", [])

        if (
            not isinstance(submitted_items, list)
            or not submitted_items
        ):
            return jsonify({
                "error": "Add at least one product to the order"
            }), 400

        inventory = read_inventory()

        inventory_by_id = {
            safe_int(product.get("product_id"), -1): product
            for product in inventory
        }

        quantities = {}

        # Validate product IDs and quantities.
        for item in submitted_items:
            if not isinstance(item, dict):
                return jsonify({
                    "error": "Each order item must be an object"
                }), 400

            product_id = safe_int(
                item.get("product_id"), -1
            )
            quantity = safe_int(
                item.get("quantity"), 0
            )

            if product_id not in inventory_by_id:
                return jsonify({
                    "error": f"Product {product_id} was not found"
                }), 400

            if quantity <= 0:
                return jsonify({
                    "error": "Every order quantity must be positive"
                }), 400

            quantities[product_id] = (
                quantities.get(product_id, 0) + quantity
            )

        # Use product prices from inventory, not client-submitted prices.
        order_items = []
        total_cost = 0.0

        for product_id, quantity in quantities.items():
            product = inventory_by_id[product_id]
            unit_price = safe_float(
                product.get("unit_price")
            )
            line_total = round(
                quantity * unit_price, 2
            )

            order_items.append({
                "product_id": product_id,
                "product": product.get("product", ""),
                "category": product.get("category", ""),
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total
            })

            total_cost += line_total

        now = datetime.now().isoformat(
            timespec="seconds"
        )

        order = {
            "order_id": generate_transaction_id("PO"),
            "created_at": now,
            "updated_at": now,
            "supplier_name": supplier_name,
            "supplier_email": str(
                data.get("supplier_email", "")
            ).strip(),
            "supplier_phone": str(
                data.get("supplier_phone", "")
            ).strip(),
            "status": "Draft",
            "items": order_items,
            "total_cost": round(total_cost, 2),
            "received_at": ""
        }

        orders = read_purchase_orders()
        orders.append(order)
        write_purchase_orders(orders)

        return jsonify({
            "message": "Purchase-order draft saved",
            "purchase_order": order
        }), 201

    except Exception as error:
        app.logger.exception(
            "Purchase-order creation failed"
        )
        return jsonify({"error": str(error)}), 500


# ---------------- UPDATE PURCHASE ORDER STATUS ----------------

@app.route(
    "/api/purchase-orders/<order_id>/status",
    methods=["PUT"]
)
def update_purchase_order_status(order_id):
    try:
        data = request.get_json(silent=True) or {}
        new_status = str(
            data.get("status", "")
        ).strip().title()

        if new_status not in {
            "Approved", "Received", "Cancelled"
        }:
            return jsonify({
                "error": (
                    "Status must be Approved, Received, "
                    "or Cancelled"
                )
            }), 400

        orders = read_purchase_orders()

        order = next(
            (
                item for item in orders
                if item.get("order_id") == order_id
            ),
            None
        )

        if order is None:
            return jsonify({
                "error": "Purchase order not found"
            }), 404

        current_status = order.get("status", "Draft")

        allowed_transitions = {
            "Draft": {"Approved", "Cancelled"},
            "Approved": {"Received", "Cancelled"},
            "Received": set(),
            "Cancelled": set()
        }

        if new_status not in allowed_transitions.get(
            current_status, set()
        ):
            return jsonify({
                "error": (
                    f"Cannot change purchase order from "
                    f"{current_status} to {new_status}"
                )
            }), 409

        now = datetime.now().isoformat(
            timespec="seconds"
        )

        # Stock is changed only when an approved order is received.
        if new_status == "Received":
            inventory = read_inventory()

            inventory_by_id = {
                safe_int(product.get("product_id"), -1): product
                for product in inventory
            }

            order_items = order.get("items", [])

            # Validate every item before changing any stock.
            for line in order_items:
                product_id = safe_int(
                    line.get("product_id"), -1
                )
                quantity = safe_int(
                    line.get("quantity"), 0
                )

                if product_id not in inventory_by_id:
                    return jsonify({
                        "error": (
                            f"Product {product_id} no longer exists. "
                            "No stock was changed."
                        )
                    }), 409

                if quantity <= 0:
                    return jsonify({
                        "error": "Invalid quantity in saved order"
                    }), 409

            received_lines = []

            # Update stock in memory.
            for line in order_items:
                product_id = safe_int(line["product_id"])
                quantity = safe_int(line["quantity"])
                product = inventory_by_id[product_id]

                old_stock = safe_int(
                    product.get("current_stock")
                )
                new_stock = old_stock + quantity

                reorder_level = safe_int(
                    product.get("reorder_level")
                )
                unit_price = safe_float(
                    product.get("unit_price")
                )

                product.update({
                    "current_stock": str(new_stock),
                    "inventory_value": str(
                        round(new_stock * unit_price, 2)
                    ),
                    "status": calculate_inventory_status(
                        new_stock, reorder_level
                    )
                })

                received_lines.append((product, quantity))

            # Persist inventory after all lines are validated.
            write_inventory(inventory)

            # Record each receipt using the existing transaction helper.
            for product, quantity in received_lines:
                add_inventory_transaction(
                    product=product,
                    action="purchase_order_received",
                    quantity=quantity,
                    quantity_change=quantity,
                    reason=f"Received purchase order {order_id}"
                )

            order["received_at"] = now

        order["status"] = new_status
        order["updated_at"] = now

        write_purchase_orders(orders)

        return jsonify({
            "message": f"Purchase order marked {new_status}",
            "purchase_order": order
        }), 200

    except Exception as error:
        app.logger.exception(
            "Purchase-order status update failed"
        )
        return jsonify({"error": str(error)}), 500


# =============================
# SEND MAIL
# =============================


@app.route(
    "/api/purchase-orders/<order_id>/send-inquiry",
    methods=["POST"]
)
def send_purchase_order_inquiry(order_id):
    if not resend.api_key or not RESEND_FROM_EMAIL:
        return jsonify({
            "error": "Resend is not configured. Check your environment variables."
        }), 500

    orders = read_purchase_orders()

    order = next(
        (
            item for item in orders
            if str(item.get("order_id")) == str(order_id)
        ),
        None
    )

    if order is None:
        return jsonify({"error": "Purchase order not found."}), 404

    if order.get("status") != "Draft":
        return jsonify({
            "error": "Only draft purchase orders can send a new inquiry."
        }), 400

    supplier_name = str(order.get("supplier_name", "")).strip()
    supplier_email = str(order.get("supplier_email", "")).strip()
    items = order.get("items", [])

    if not supplier_name or not supplier_email:
        return jsonify({
            "error": "Supplier name and email are required."
        }), 400

    if not isinstance(items, list) or not items:
        return jsonify({
            "error": "This purchase order has no product items."
        }), 400

    product_lines = []

    for item in items:
        product_name = str(
            item.get("product") or item.get("product_id") or ""
        ).strip()

        try:
            quantity = int(item.get("quantity", 0))
        except (ValueError, TypeError):
            quantity = 0

        if not product_name or quantity <= 0:
            return jsonify({
                "error": "A product has an invalid name or quantity."
            }), 400

        product_lines.append(f"- {product_name}: {quantity} units")

    po_number = str(order.get("order_id", order_id))
    product_list = "\n".join(product_lines)

    email_text = f"""Dear {supplier_name},

We are interested in purchasing the following products for our retail inventory.

Purchase inquiry: {po_number}

Requested products:
{product_list}

Please provide your quotation with the following details:

1. Unit prices and bulk purchase discounts
2. Current stock availability
3. Applicable GST and other charges
4. Shipping or delivery charges
5. Expected delivery timeline
6. Quotation validity and payment terms

Please share your quotation so that we can review the prices and
terms before confirming the purchase.

This email is a request for quotation (RFQ), not a confirmed
purchase commitment. We will confirm the purchase after reviewing
and agreeing on the final quotation and terms.

Thank you,
Purchasing Department
Intelligent Retail Analytics and Inventory Optimization System
"""

    try:
        result = resend.Emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": [supplier_email],
            "subject": f"Request for Quotation (RFQ) - {po_number}",
            "text": email_text,
        })

        # Mark approved only after Resend accepts the email request.
        order["status"] = "Approved"
        write_purchase_orders(orders)

        app.logger.info(
            "Supplier RFQ submitted for %s to %s",
            po_number,
            supplier_email
        )

        return jsonify({
            "success": True,
            "message": (
                f"RFQ submitted for {po_number}. "
                "The purchase order is now Approved."
            )
        }), 200

    except Exception:
        app.logger.exception(
            "Supplier RFQ failed for purchase order %s", order_id
        )
        return jsonify({
            "error": (
                "The inquiry could not be completed. "
                "Check the Flask logs and Resend dashboard."
            )
        }), 502


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("RETAIL ANALYTICS BACKEND")
    print("=" * 60)
    print("Server: http://127.0.0.1:5000")
    print("Products: http://127.0.0.1:5000/api/products")
    print("Dashboard: http://127.0.0.1:5000/api/dashboard")
    print("Sales: http://127.0.0.1:5000/api/sales")
    print("Transactions: http://127.0.0.1:5000/api/transactions")
    print("Forecast: http://127.0.0.1:5000/api/forecast")
    print("=" * 60)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
