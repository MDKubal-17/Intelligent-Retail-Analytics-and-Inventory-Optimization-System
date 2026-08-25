from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import csv
import os

app = Flask(__name__)

# ==========================================
# CORS
# ==========================================

CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True
)

# ==========================================
# PATHS
# ==========================================

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")

CSV_FILE = os.path.join(DATA_DIR, "inventory_data.csv")
SALES_FILE = os.path.join(DATA_DIR, "sales_data.csv")


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():
    return jsonify({
        "message": "Retail Analytics Backend is running!"
    })


# ==========================================
# SERVE RAW CSV DATA
# ==========================================

@app.route("/api/inventory/data/sales", methods=["GET"])
@app.route("/api/data/sales", methods=["GET"])
def serve_sales_csv():

    if not os.path.exists(SALES_FILE):
        return jsonify({
            "error": "Sales CSV not found"
        }), 404

    return send_from_directory(
        DATA_DIR,
        "sales_data.csv",
        mimetype="text/csv"
    )


@app.route("/api/inventory/data/inventory", methods=["GET"])
@app.route("/api/data/inventory", methods=["GET"])
def serve_inventory_csv():

    if not os.path.exists(CSV_FILE):
        return jsonify({
            "error": "Inventory CSV not found"
        }), 404

    return send_from_directory(
        DATA_DIR,
        "inventory_data.csv",
        mimetype="text/csv"
    )


# ==========================================
# GET ALL PRODUCTS
# ==========================================

@app.route("/api/products", methods=["GET"])
def get_products():

    products = []

    try:

        if not os.path.exists(CSV_FILE):
            return jsonify([])

        with open(
            CSV_FILE,
            mode="r",
            encoding="utf-8",
            newline=""
        ) as file:

            reader = csv.DictReader(file)

            for row in reader:

                # Ignore empty rows
                if not row.get("product_id"):
                    continue

                products.append({

                    "id": int(row["product_id"]),

                    "product": row.get(
                        "product",
                        ""
                    ),

                    "category": row.get(
                        "category",
                        ""
                    ),

                    "current_stock": int(
                        float(
                            row.get(
                                "current_stock",
                                0
                            ) or 0
                        )
                    ),

                    "reorder_level": int(
                        float(
                            row.get(
                                "reorder_level",
                                0
                            ) or 0
                        )
                    ),

                    "unit_price": float(
                        row.get(
                            "unit_price",
                            0
                        ) or 0
                    ),

                    "inventory_value": float(
                        row.get(
                            "inventory_value",
                            0
                        ) or 0
                    ),

                    "status": row.get(
                        "status",
                        ""
                    ),

                    # =================================
                    # IMAGE URL
                    # =================================
                    "img_url": row.get(
                        "img_url",
                        ""
                    )
                })

        return jsonify(products)

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# ADD PRODUCT
# ==========================================

@app.route(
    "/api/products",
    methods=["POST", "OPTIONS"]
)
def add_product():

    # Handle CORS preflight
    if request.method == "OPTIONS":
        return "", 200

    try:

        data = request.get_json(
            force=True
        ) or {}

        # ======================================
        # READ DATA FROM FRONTEND
        # ======================================

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

        current_stock = int(
            data.get(
                "current_stock",
                0
            )
        )

        reorder_level = int(
            data.get(
                "reorder_level",
                0
            )
        )

        unit_price = float(
            data.get(
                "unit_price",
                0
            )
        )

        # ======================================
        # IMAGE URL
        # ======================================

        img_url = str(
            data.get(
                "img_url",
                ""
            )
        ).strip()

        # ======================================
        # VALIDATION
        # ======================================

        if not product:

            return jsonify({
                "error": "Product name is required"
            }), 400

        if not category:

            return jsonify({
                "error": "Category is required"
            }), 400

        # ======================================
        # CALCULATE VALUES
        # ======================================

        inventory_value = (
            current_stock * unit_price
        )

        if current_stock <= reorder_level:
            status = "Low Stock"
        else:
            status = "In Stock"

        # ======================================
        # CSV COLUMNS
        # ======================================

        fieldnames = [

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

        # ======================================
        # READ EXISTING CSV
        # ======================================

        rows = []

        if os.path.exists(CSV_FILE):

            with open(
                CSV_FILE,
                "r",
                encoding="utf-8",
                newline=""
            ) as file:

                reader = csv.DictReader(file)

                rows = [
                    row
                    for row in list(reader)
                    if row.get("product_id")
                ]

        # ======================================
        # CLEAN EXISTING ROWS
        # ======================================

        clean_rows = []

        for row in rows:

            try:

                stock = int(
                    float(
                        row.get(
                            "current_stock",
                            0
                        ) or 0
                    )
                )

            except:

                stock = 0

            try:

                reorder = int(
                    float(
                        row.get(
                            "reorder_level",
                            0
                        ) or 0
                    )
                )

            except:

                reorder = 0

            try:

                price = float(
                    row.get(
                        "unit_price",
                        0
                    ) or 0
                )

            except:

                price = 0

            try:

                inventory_value_existing = float(
                    row.get(
                        "inventory_value",
                        stock * price
                    ) or 0
                )

            except:

                inventory_value_existing = (
                    stock * price
                )

            # Recalculate status
            if stock <= reorder:
                row_status = "Low Stock"
            else:
                row_status = "In Stock"

            clean_rows.append({

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

                "current_stock": stock,

                "reorder_level": reorder,

                "unit_price": price,

                "inventory_value": (
                    inventory_value_existing
                ),

                "status": row_status,

                # Preserve existing image URL
                "img_url": row.get(
                    "img_url",
                    ""
                )
            })

        # ======================================
        # CREATE NEW PRODUCT ID
        # ======================================

        new_id = max(
            [
                int(row["product_id"])
                for row in clean_rows
                if row.get("product_id")
            ],
            default=0
        ) + 1

        # ======================================
        # CREATE NEW PRODUCT
        # ======================================

        new_product = {

            "product_id": new_id,

            "product": product,

            "category": category,

            "current_stock": current_stock,

            "reorder_level": reorder_level,

            "unit_price": unit_price,

            "inventory_value": inventory_value,

            "status": status,

            "img_url": img_url
        }

        clean_rows.append(
            new_product
        )

        # ======================================
        # WRITE CSV
        # ======================================

        with open(
            CSV_FILE,
            "w",
            encoding="utf-8",
            newline=""
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=fieldnames
            )

            writer.writeheader()

            writer.writerows(
                clean_rows
            )

        # ======================================
        # RESPONSE
        # ======================================

        return jsonify({

            "message":
                "Product added successfully",

            "product":
                new_product

        }), 201

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# UPDATE PRODUCT
# ==========================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["PUT", "OPTIONS"]
)
def update_product(product_id):

    # Handle CORS preflight
    if request.method == "OPTIONS":
        return "", 200

    try:

        data = request.get_json(
            force=True
        ) or {}

        # ======================================
        # READ DATA
        # ======================================

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

        current_stock = int(
            data.get(
                "current_stock",
                0
            )
        )

        reorder_level = int(
            data.get(
                "reorder_level",
                0
            )
        )

        unit_price = float(
            data.get(
                "unit_price",
                0
            )
        )

        # ======================================
        # IMAGE URL
        # ======================================

        img_url = str(
            data.get(
                "img_url",
                ""
            )
        ).strip()

        # ======================================
        # CALCULATE VALUES
        # ======================================

        inventory_value = (
            current_stock * unit_price
        )

        if current_stock <= reorder_level:
            status = "Low Stock"
        else:
            status = "In Stock"

        # ======================================
        # READ CSV
        # ======================================

        rows = []

        if os.path.exists(CSV_FILE):

            with open(
                CSV_FILE,
                "r",
                encoding="utf-8",
                newline=""
            ) as file:

                reader = csv.DictReader(file)

                rows = list(reader)

        # ======================================
        # FIND PRODUCT
        # ======================================

        product_found = False

        for row in rows:

            if (
                row.get("product_id")
                and int(row["product_id"])
                == product_id
            ):

                row["product"] = product

                row["category"] = category

                row["current_stock"] = (
                    current_stock
                )

                row["reorder_level"] = (
                    reorder_level
                )

                row["unit_price"] = (
                    unit_price
                )

                row["inventory_value"] = (
                    inventory_value
                )

                row["status"] = status

                # ==================================
                # SAVE IMAGE URL
                # ==================================

                row["img_url"] = img_url

                product_found = True

                break

        # ======================================
        # PRODUCT NOT FOUND
        # ======================================

        if not product_found:

            return jsonify({
                "error": "Product not found"
            }), 404

        # ======================================
        # CSV COLUMNS
        # ======================================

        fieldnames = [

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

        # ======================================
        # REMOVE EMPTY ROWS
        # ======================================

        clean_rows = [

            row
            for row in rows
            if row.get("product_id")
        ]

        # ======================================
        # WRITE CSV
        # ======================================

        with open(
            CSV_FILE,
            "w",
            encoding="utf-8",
            newline=""
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=fieldnames
            )

            writer.writeheader()

            # Make sure every row has img_url
            for row in clean_rows:

                if "img_url" not in row:
                    row["img_url"] = ""

            writer.writerows(
                clean_rows
            )

        # ======================================
        # RESPONSE
        # ======================================

        return jsonify({

            "message":
                "Product updated successfully",

            "product": {

                "product_id":
                    product_id,

                "product":
                    product,

                "category":
                    category,

                "current_stock":
                    current_stock,

                "reorder_level":
                    reorder_level,

                "unit_price":
                    unit_price,

                "inventory_value":
                    inventory_value,

                "status":
                    status,

                "img_url":
                    img_url
            }

        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# DELETE PRODUCT
# ==========================================

@app.route(
    "/api/products/<int:product_id>",
    methods=["DELETE", "OPTIONS"]
)
def delete_product(product_id):

    # Handle CORS preflight
    if request.method == "OPTIONS":
        return "", 200

    try:

        rows = []

        if os.path.exists(CSV_FILE):

            with open(
                CSV_FILE,
                "r",
                encoding="utf-8",
                newline=""
            ) as file:

                reader = csv.DictReader(file)

                rows = list(reader)

        # ======================================
        # CHECK PRODUCT
        # ======================================

        product_found = any(

            row.get("product_id")
            and int(row["product_id"])
            == product_id

            for row in rows
        )

        if not product_found:

            return jsonify({
                "error": "Product not found"
            }), 404

        # ======================================
        # REMOVE PRODUCT
        # ======================================

        rows = [

            row
            for row in rows

            if not row.get("product_id")
            or int(row["product_id"])
            != product_id
        ]

        # ======================================
        # CSV COLUMNS
        # ======================================

        fieldnames = [

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

        # ======================================
        # WRITE CSV
        # ======================================

        with open(
            CSV_FILE,
            "w",
            encoding="utf-8",
            newline=""
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=fieldnames
            )

            writer.writeheader()

            for row in rows:

                if "img_url" not in row:
                    row["img_url"] = ""

            writer.writerows(
                rows
            )

        return jsonify({

            "message":
                "Product deleted successfully"

        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# DASHBOARD
# ==========================================

@app.route(
    "/api/dashboard",
    methods=["GET"]
)
def dashboard():

    try:

        # ======================================
        # READ INVENTORY
        # ======================================

        inventory = []

        if os.path.exists(CSV_FILE):

            with open(
                CSV_FILE,
                "r",
                encoding="utf-8",
                newline=""
            ) as file:

                inventory = [

                    row
                    for row in list(
                        csv.DictReader(file)
                    )

                    if row.get("product_id")
                ]

        # ======================================
        # TOTAL PRODUCTS
        # ======================================

        total_products = len(
            inventory
        )

        # ======================================
        # LOW STOCK
        # ======================================

        low_stock_products = []

        for item in inventory:

            current_stock = int(
                float(
                    item.get(
                        "current_stock",
                        0
                    ) or 0
                )
            )

            reorder_level = int(
                float(
                    item.get(
                        "reorder_level",
                        0
                    ) or 0
                )
            )

            if current_stock <= reorder_level:

                low_stock_products.append({

                    "product":
                        item.get(
                            "product",
                            ""
                        ),

                    "stock":
                        current_stock,

                    "reorder_level":
                        reorder_level
                })

        # ======================================
        # INVENTORY VALUE
        # ======================================

        total_inventory_value = sum(

            float(
                item.get(
                    "inventory_value",
                    0
                ) or 0
            )

            for item in inventory
        )

        # ======================================
        # READ SALES CSV
        # ======================================

        sales = []

        if os.path.exists(SALES_FILE):

            with open(
                SALES_FILE,
                "r",
                encoding="utf-8",
                newline=""
            ) as file:

                sales = [

                    row
                    for row in list(
                        csv.DictReader(file)
                    )

                    if row.get(
                        "transaction_id"
                    )
                ]

        # ======================================
        # TOTAL SALES
        # ======================================

        total_sales = 0

        for sale in sales:

            quantity = float(
                sale.get(
                    "quantity",
                    0
                ) or 0
            )

            unit_price = float(
                sale.get(
                    "unit_price",
                    0
                ) or 0
            )

            discount = float(
                sale.get(
                    "discount_percent",
                    0
                ) or 0
            )

            sale_value = (
                quantity * unit_price
            )

            discount_amount = (
                sale_value * discount / 100
            )

            total_sales += (
                sale_value
                - discount_amount
            )

        # Inventory stock grouped by category
        category_stock = {}

        for item in inventory:
            category = item.get("category", "Unknown")

            try:
                stock = int(float(item.get("current_stock", 0)))
            except (ValueError, TypeError):
                stock = 0

            if category not in category_stock:
                category_stock[category] = 0

            category_stock[category] += stock

        inventory_by_category = [
            {
                "category": category,
                "stock": stock
            }
            for category, stock in category_stock.items()
        ]

        # ======================================
        # RESPONSE
        # ======================================

        return jsonify({

            "total_products":
                total_products,

            "low_stock":
                len(low_stock_products),

            "total_inventory_value":
                total_inventory_value,

            "total_sales":
                total_sales,

            "low_stock_products":
                low_stock_products,

            "inventory_by_category": inventory_by_category

        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )
