from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import csv
import os
import joblib
import pandas as pd
from datetime import datetime
from chronos import Chronos2Pipeline


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

# CORS
CORS(app, resources={r"/*": {"origins": "*"}})


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

CSV_FILE = os.path.join(DATA_DIR, "inventory_data.csv")
SALES_FILE = os.path.join(DATA_DIR, "sales_data.csv")
TRANSACTIONS_FILE = os.path.join(
    DATA_DIR,
    "inventory_transactions.csv"
)

FORECAST_DATA_FILE = os.path.join(
    DATA_DIR,
    "complete_daily_sales.csv"
)


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
# LOAD ML MODEL
# ============================================================

try:

    model = joblib.load(
        os.path.join(BASE_DIR, "rf_model.pkl")
    )

    le_product = joblib.load(
        os.path.join(BASE_DIR, "le_product.pkl")
    )

    le_category = joblib.load(
        os.path.join(BASE_DIR, "le_category.pkl")
    )

    print("Random Forest model loaded successfully.")

except Exception as error:

    print("WARNING: ML model could not be loaded.")
    print(error)

    model = None
    le_product = None
    le_category = None


# ============================================================
# LOAD CHRONOS-2
# ============================================================

try:

    print("Loading Amazon Chronos-2 model...")

    chronos_pipeline = Chronos2Pipeline.from_pretrained(
        "amazon/chronos-2",
        device_map="cpu"
    )

    print("Chronos-2 loaded successfully.")

except Exception as error:

    print("WARNING: Chronos-2 could not be loaded.")
    print(error)

    chronos_pipeline = None


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
# INVENTORY CSV HELPERS
# ============================================================

def read_inventory():

    if not os.path.exists(CSV_FILE):
        return []

    inventory = []

    with open(
        CSV_FILE,
        "r",
        encoding="utf-8",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            if not row.get("product_id"):
                continue

            stock = safe_int(
                row.get("current_stock")
            )

            reorder_level = safe_int(
                row.get("reorder_level")
            )

            unit_price = safe_float(
                row.get("unit_price")
            )

            inventory_value = round(
                stock * unit_price,
                2
            )

            inventory.append({

                "product_id": str(
                    row.get("product_id")
                ),

                "product": row.get(
                    "product",
                    ""
                ),

                "category": row.get(
                    "category",
                    ""
                ),

                "current_stock": str(
                    stock
                ),

                "reorder_level": str(
                    reorder_level
                ),

                "unit_price": str(
                    unit_price
                ),

                "inventory_value": str(
                    inventory_value
                ),

                "status": calculate_inventory_status(
                    stock,
                    reorder_level
                ),

                "img_url": row.get(
                    "img_url",
                    ""
                )
            })

    return inventory


def write_inventory(inventory):

    os.makedirs(
        DATA_DIR,
        exist_ok=True
    )

    with open(
        CSV_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=INVENTORY_FIELDS
        )

        writer.writeheader()

        for row in inventory:

            clean_row = {

                "product_id":
                    row.get(
                        "product_id",
                        ""
                    ),

                "product":
                    row.get(
                        "product",
                        ""
                    ),

                "category":
                    row.get(
                        "category",
                        ""
                    ),

                "current_stock":
                    row.get(
                        "current_stock",
                        0
                    ),

                "reorder_level":
                    row.get(
                        "reorder_level",
                        0
                    ),

                "unit_price":
                    row.get(
                        "unit_price",
                        0
                    ),

                "inventory_value":
                    row.get(
                        "inventory_value",
                        0
                    ),

                "status":
                    row.get(
                        "status",
                        ""
                    ),

                "img_url":
                    row.get(
                        "img_url",
                        ""
                    )
            }

            writer.writerow(clean_row)


# ============================================================
# SALES CSV HELPERS
# ============================================================

def read_sales():

    if not os.path.exists(SALES_FILE):
        return []

    sales = []

    with open(
        SALES_FILE,
        "r",
        encoding="utf-8",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            if not row.get("transaction_id"):
                continue

            quantity = safe_float(
                row.get("quantity")
            )

            unit_price = safe_float(
                row.get("unit_price")
            )

            discount = safe_float(
                row.get("discount_percent")
            )

            calculated_revenue = (
                quantity
                * unit_price
                * (1 - discount / 100)
            )

            sales.append({

                "date": row.get(
                    "date",
                    ""
                ),

                "product_id": row.get(
                    "product_id",
                    ""
                ),

                "product": row.get(
                    "product",
                    ""
                ),

                "category": row.get(
                    "category",
                    ""
                ),

                "quantity": quantity,

                "unit_price": unit_price,

                "discount_percent": discount,

                "revenue": round(
                    calculated_revenue,
                    2
                ),

                "transaction_id": row.get(
                    "transaction_id",
                    ""
                )
            })

    return sales


def append_sale(
    product,
    quantity,
    unit_price,
    discount_percent=0
):

    os.makedirs(
        DATA_DIR,
        exist_ok=True
    )

    transaction_id = generate_transaction_id(
        "TXN"
    )

    sale_date = datetime.now().strftime(
        "%Y-%m-%d"
    )

    quantity = safe_float(quantity)
    unit_price = safe_float(unit_price)
    discount_percent = safe_float(
        discount_percent
    )

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

    # --------------------------------------------------------
    # Read existing sales
    # --------------------------------------------------------

    existing_sales = read_sales()

    # --------------------------------------------------------
    # Add new sale
    # --------------------------------------------------------

    existing_sales.append({

        "date": sale_date,

        "product_id": product[
            "product_id"
        ],

        "product": product[
            "product"
        ],

        "category": product[
            "category"
        ],

        "quantity": quantity,

        "unit_price": unit_price,

        "discount_percent":
            discount_percent,

        "revenue": round(
            revenue,
            2
        ),

        "transaction_id":
            transaction_id
    })

    # --------------------------------------------------------
    # Rewrite using correct CSV structure
    # --------------------------------------------------------

    with open(
        SALES_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=SALES_FIELDS
        )

        writer.writeheader()

        for sale in existing_sales:

            writer.writerow({

                "date":
                    sale.get(
                        "date",
                        ""
                    ),

                "product_id":
                    sale.get(
                        "product_id",
                        ""
                    ),

                "product":
                    sale.get(
                        "product",
                        ""
                    ),

                "category":
                    sale.get(
                        "category",
                        ""
                    ),

                "quantity":
                    sale.get(
                        "quantity",
                        0
                    ),

                "unit_price":
                    sale.get(
                        "unit_price",
                        0
                    ),

                "discount_percent":
                    sale.get(
                        "discount_percent",
                        0
                    ),

                "revenue":
                    sale.get(
                        "revenue",
                        0
                    ),

                "transaction_id":
                    sale.get(
                        "transaction_id",
                        ""
                    )
            })

    return transaction_id, revenue


# ============================================================
# INVENTORY TRANSACTION HELPER
# ============================================================

def add_inventory_transaction(
    product,
    action,
    quantity,
    quantity_change,
    reason=""
):

    os.makedirs(
        DATA_DIR,
        exist_ok=True
    )

    transaction_id = generate_transaction_id(
        "ITXN"
    )

    transaction_exists = (
        os.path.exists(
            TRANSACTIONS_FILE
        )
        and
        os.path.getsize(
            TRANSACTIONS_FILE
        ) > 0
    )

    with open(
        TRANSACTIONS_FILE,
        "a",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=TRANSACTION_FIELDS
        )

        if not transaction_exists:

            writer.writeheader()

        writer.writerow({

            "transaction_id":
                transaction_id,

            "date":
                datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),

            "product_id":
                product["product_id"],

            "product":
                product["product"],

            "action":
                action,

            "quantity":
                quantity,

            "quantity_change":
                quantity_change,

            "reason":
                reason
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

    if not os.path.exists(CSV_FILE):

        return jsonify({
            "error":
                "Inventory CSV not found"
        }), 404

    return send_from_directory(
        DATA_DIR,
        "inventory_data.csv",
        mimetype="text/csv"
    )


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

    if not os.path.exists(SALES_FILE):

        return jsonify({
            "error":
                "Sales CSV not found"
        }), 404

    return send_from_directory(
        DATA_DIR,
        "sales_data.csv",
        mimetype="text/csv"
    )


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

        if not os.path.exists(
            TRANSACTIONS_FILE
        ):

            return jsonify({

                "count": 0,

                "transactions": []

            })

        transactions = []

        with open(
            TRANSACTIONS_FILE,
            "r",
            encoding="utf-8",
            newline=""
        ) as file:

            reader = csv.DictReader(
                file
            )

            for row in reader:

                if not row.get(
                    "transaction_id"
                ):

                    continue

                transactions.append({

                    "transaction_id":
                        row.get(
                            "transaction_id",
                            ""
                        ),

                    "date":
                        row.get(
                            "date",
                            ""
                        ),

                    "product_id":
                        safe_int(
                            row.get(
                                "product_id"
                            )
                        ),

                    "product":
                        row.get(
                            "product",
                            ""
                        ),

                    "action":
                        row.get(
                            "action",
                            ""
                        ),

                    "quantity":
                        safe_int(
                            row.get(
                                "quantity"
                            )
                        ),

                    "quantity_change":
                        safe_int(
                            row.get(
                                "quantity_change"
                            )
                        ),

                    "reason":
                        row.get(
                            "reason",
                            ""
                        )
                })

        return jsonify({

            "count":
                len(transactions),

            "transactions":
                transactions

        })

    except Exception as error:

        return jsonify({
            "error":
                str(error)
        }), 500


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

        inventory_transaction_id = (
            add_inventory_transaction(

                product=product,

                action=action,

                quantity=quantity,

                quantity_change=
                    quantity_change,

                reason=reason
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

        if model is None:

            return jsonify({

                "error":
                    "Random Forest model is not loaded"

            }), 500

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

        if chronos_pipeline is None:

            return jsonify({

                "error":
                    "Chronos-2 model is not loaded"

            }), 500

        # ----------------------------------------------------
        # CHECK DATASET
        # ----------------------------------------------------

        if not os.path.exists(
            FORECAST_DATA_FILE
        ):

            return jsonify({

                "error":
                    "complete_daily_sales.csv not found"

            }), 404

        # ----------------------------------------------------
        # LOAD DATA
        # ----------------------------------------------------

        df = pd.read_csv(
            FORECAST_DATA_FILE
        )

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
                df[
                    "product_id"
                ]
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
                safe_int(
                    item["product_id"]
                )
            ] = item

        # ----------------------------------------------------
        # FORECAST
        # ----------------------------------------------------

        all_forecasts = []

        for product_id in product_ids:

            product_df = df[
                df["product_id"]
                == product_id
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

                forecast_date = (

                    last_date
                    + pd.Timedelta(
                        days=index + 1
                    )
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
