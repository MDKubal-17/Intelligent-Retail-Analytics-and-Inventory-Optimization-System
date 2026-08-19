from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import os
import tempfile

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "https://retail-frontend-e00p.onrender.com"
])

CSV_FILE = os.path.join(
    os.path.dirname(__file__),
    "data",
    "inventory_data.csv"
)

SALES_FILE = os.path.join(
    os.path.dirname(__file__),
    "data",
    "sales_data.csv"
)


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():
    return jsonify({
        "message": "Retail Analytics Backend is running!"
    })


# ==========================================
# GET ALL PRODUCTS
# ==========================================

@app.route("/api/products", methods=["GET"])
def get_products():

    products = []

    try:
        with open(CSV_FILE, mode="r", encoding="utf-8") as file:

            reader = csv.DictReader(file)

            for row in reader:

                # Ignore completely empty rows
                if not row.get("product_id"):
                    continue

                products.append({
                    "id": int(row["product_id"]),
                    "product": row["product"],
                    "category": row["category"],
                    "current_stock": int(row["current_stock"]),
                    "reorder_level": int(row["reorder_level"]),
                    "unit_price": float(row["unit_price"]),
                    "inventory_value": float(row["inventory_value"]),
                    "status": row.get("status", "")
                })

        return jsonify(products)

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# ADD PRODUCT
# ==========================================

@app.route("/api/products", methods=["POST"])
def add_product():

    try:
        data = request.get_json()

        product = data.get("product", "").strip()
        category = data.get("category", "").strip()

        current_stock = int(data.get("current_stock", 0))
        reorder_level = int(data.get("reorder_level", 0))
        unit_price = float(data.get("unit_price", 0))

        if not product:
            return jsonify({"error": "Product name is required"}), 400

        if not category:
            return jsonify({"error": "Category is required"}), 400

        # Calculate values
        inventory_value = current_stock * unit_price

        if current_stock <= reorder_level:
            status = "Low Stock"
        else:
            status = "In Stock"

        # --------------------------------
        # READ EXISTING CSV
        # --------------------------------

        with open(CSV_FILE, "r", encoding="utf-8", newline="") as file:

            reader = csv.DictReader(file)

            rows = list(reader)

            # Force the correct column structure
            fieldnames = [
                "product_id",
                "product",
                "category",
                "current_stock",
                "reorder_level",
                "unit_price",
                "inventory_value",
                "status"
            ]

        # --------------------------------
        # CLEAN EXISTING ROWS
        # --------------------------------

        clean_rows = []

        for row in rows:

            # Skip empty rows
            if not row.get("product_id"):
                continue

            stock = int(row.get("current_stock", 0))
            reorder = int(row.get("reorder_level", 0))

            # Recalculate status
            if stock <= reorder:
                row_status = "Low Stock"
            else:
                row_status = "In Stock"

            clean_rows.append({
                "product_id": row.get("product_id", ""),
                "product": row.get("product", ""),
                "category": row.get("category", ""),
                "current_stock": row.get("current_stock", 0),
                "reorder_level": row.get("reorder_level", 0),
                "unit_price": row.get("unit_price", 0),
                "inventory_value": row.get("inventory_value", 0),
                "status": row_status
            })

        # --------------------------------
        # CREATE NEW ID
        # --------------------------------

        if clean_rows:

            new_id = max(
                int(row["product_id"])
                for row in clean_rows
            ) + 1

        else:
            new_id = 1

        # --------------------------------
        # CREATE NEW PRODUCT
        # --------------------------------

        new_product = {
            "product_id": new_id,
            "product": product,
            "category": category,
            "current_stock": current_stock,
            "reorder_level": reorder_level,
            "unit_price": unit_price,
            "inventory_value": inventory_value,
            "status": status
        }

        clean_rows.append(new_product)

        # --------------------------------
        # WRITE CSV
        # --------------------------------

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

            writer.writerows(clean_rows)

        return jsonify({
            "message": "Product added successfully",
            "product": new_product
        }), 201

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


@app.route("/api/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):

    try:
        data = request.get_json()

        product = data.get("product", "").strip()
        category = data.get("category", "").strip()
        current_stock = int(data.get("current_stock", 0))
        reorder_level = int(data.get("reorder_level", 0))
        unit_price = float(data.get("unit_price", 0))

        inventory_value = current_stock * unit_price

        if current_stock <= reorder_level:
            status = "Low Stock"
        else:
            status = "In Stock"

        # Read existing products
        with open(
            CSV_FILE,
            "r",
            encoding="utf-8",
            newline=""
        ) as file:

            reader = csv.DictReader(file)
            rows = list(reader)

        # Make sure the product exists
        product_found = False

        for row in rows:

            if not row.get("product_id"):
                continue

            if int(row["product_id"]) == product_id:

                row["product"] = product
                row["category"] = category
                row["current_stock"] = current_stock
                row["reorder_level"] = reorder_level
                row["unit_price"] = unit_price
                row["inventory_value"] = inventory_value
                row["status"] = status

                product_found = True
                break

        if not product_found:

            return jsonify({
                "error": "Product not found"
            }), 404

        # Columns in our CSV
        fieldnames = [
            "product_id",
            "product",
            "category",
            "current_stock",
            "reorder_level",
            "unit_price",
            "inventory_value",
            "status"
        ]

        # Remove empty rows
        clean_rows = [
            row for row in rows
            if row.get("product_id")
        ]

        # Write updated CSV
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
            writer.writerows(clean_rows)

        return jsonify({
            "message": "Product updated successfully"
        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):

    try:
        # Read existing products
        with open(
            CSV_FILE,
            "r",
            encoding="utf-8",
            newline=""
        ) as file:

            reader = csv.DictReader(file)
            rows = list(reader)

        # Check whether product exists
        product_found = any(
            row.get("product_id") and
            int(row["product_id"]) == product_id
            for row in rows
        )

        if not product_found:
            return jsonify({
                "error": "Product not found"
            }), 404

        # Remove the selected product
        rows = [
            row for row in rows
            if not row.get("product_id") or
            int(row["product_id"]) != product_id
        ]

        # Keep all 8 CSV columns
        fieldnames = [
            "product_id",
            "product",
            "category",
            "current_stock",
            "reorder_level",
            "unit_price",
            "inventory_value",
            "status"
        ]

        # Write updated CSV
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
            writer.writerows(rows)

        return jsonify({
            "message": "Product deleted successfully"
        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    try:
        # ==============================
        # READ INVENTORY CSV
        # ==============================

        with open(
            CSV_FILE,
            "r",
            encoding="utf-8",
            newline=""
        ) as file:

            inventory_reader = csv.DictReader(file)
            inventory = list(inventory_reader)

        # Remove empty rows
        inventory = [
            row for row in inventory
            if row.get("product_id")
        ]

        # ==============================
        # PRODUCT COUNT
        # ==============================

        total_products = len(inventory)

        # ==============================
        # LOW STOCK
        # ==============================

        low_stock_products = []

        for item in inventory:

            current_stock = int(item["current_stock"])
            reorder_level = int(item["reorder_level"])

            if current_stock <= reorder_level:
                low_stock_products.append({
                    "product": item["product"],
                    "stock": current_stock,
                    "reorder_level": reorder_level
                })

        low_stock_count = len(low_stock_products)

        # ==============================
        # TOTAL INVENTORY VALUE
        # ==============================

        total_inventory_value = sum(
            float(item["inventory_value"])
            for item in inventory
        )

        # ==============================
        # READ SALES CSV
        # ==============================

        with open(
            SALES_FILE,
            "r",
            encoding="utf-8",
            newline=""
        ) as file:

            sales_reader = csv.DictReader(file)
            sales = list(sales_reader)

        sales = [
            row for row in sales
            if row.get("transaction_id")
        ]

        # ==============================
        # TOTAL SALES
        # ==============================

        total_sales = 0

        for sale in sales:

            quantity = float(sale["quantity"])
            unit_price = float(sale["unit_price"])
            discount = float(
                sale.get("discount_percent", 0) or 0
            )

            sale_value = quantity * unit_price

            discount_amount = (
                sale_value * discount / 100
            )

            total_sales += (
                sale_value - discount_amount
            )

        # ==============================
        # RESPONSE
        # ==============================

        return jsonify({
            "total_products": total_products,
            "low_stock": low_stock_count,
            "total_inventory_value": total_inventory_value,
            "total_sales": total_sales,
            "low_stock_products": low_stock_products
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
