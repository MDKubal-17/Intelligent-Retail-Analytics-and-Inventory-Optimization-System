"""One-time migration of existing Retail Analytics CSV data into MongoDB.

Run from the Flask project folder:
    python migrate_csv_to_mongodb.py --data-dir ./data

Environment variables:
    NODE_API_URL=http://127.0.0.1:5001
    INTERNAL_API_KEY=<same value configured on the Node service>
"""

import argparse
import csv
import json
import os
from pathlib import Path

import requests

NODE_API_URL = os.getenv("NODE_API_URL", "http://127.0.0.1:5001").rstrip("/")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


def read_csv(path):
    if not path.exists():
        print(f"SKIP: {path.name} not found")
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def number(value, default=0):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return default


def send(collection, rows):
    headers = {"Content-Type": "application/json"}
    if INTERNAL_API_KEY:
        headers["x-internal-api-key"] = INTERNAL_API_KEY
    response = requests.put(
        f"{NODE_API_URL}/api/data/{collection}",
        json=rows,
        headers=headers,
        timeout=120,
    )
    response.raise_for_status()
    print(f"IMPORTED {collection}: {response.json().get('count', len(rows))} records")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="./data")
    args = parser.parse_args()
    data_dir = Path(args.data_dir)

    inventory = []
    for row in read_csv(data_dir / "inventory_data.csv"):
        if not row.get("product_id"):
            continue
        stock = number(row.get("current_stock"))
        price = number(row.get("unit_price"))
        reorder = number(row.get("reorder_level"))
        inventory.append({
            "product_id": str(row["product_id"]).strip(),
            "product": row.get("product", ""),
            "category": row.get("category", ""),
            "current_stock": stock,
            "reorder_level": reorder,
            "unit_price": price,
            "inventory_value": round(stock * price, 2),
            "status": "Low Stock" if stock <= reorder else "In Stock",
            "img_url": row.get("img_url", ""),
        })
    if inventory:
        send("inventory", inventory)

    sales = []
    for row in read_csv(data_dir / "sales_data.csv"):
        if not row.get("transaction_id"):
            continue
        quantity = number(row.get("quantity"))
        price = number(row.get("unit_price"))
        discount = number(row.get("discount_percent"))
        sales.append({
            "date": row.get("date", ""),
            "product_id": str(row.get("product_id", "")),
            "product": row.get("product", ""),
            "category": row.get("category", ""),
            "quantity": quantity,
            "unit_price": price,
            "discount_percent": discount,
            "revenue": round(quantity * price * (1 - discount / 100), 2),
            "transaction_id": row["transaction_id"],
        })
    if sales:
        send("sales", sales)

    transactions = []
    for row in read_csv(data_dir / "inventory_transactions.csv"):
        if not row.get("transaction_id") or not row.get("product_id"):
            continue
        transactions.append({
            "transaction_id": row["transaction_id"],
            "date": row.get("date", ""),
            "product_id": str(row["product_id"]),
            "product": row.get("product", ""),
            "action": row.get("action", ""),
            "quantity": number(row.get("quantity")),
            "quantity_change": number(row.get("quantity_change")),
            "reason": row.get("reason", ""),
        })
    if transactions:
        send("transactions", transactions)

    orders = []
    for row in read_csv(data_dir / "purchase_orders.csv"):
        try:
            items = json.loads(row.get("items_json") or "[]")
        except (TypeError, json.JSONDecodeError):
            items = []
        if not row.get("order_id"):
            continue
        orders.append({
            "order_id": row["order_id"],
            "created_at": row.get("created_at", ""),
            "updated_at": row.get("updated_at", ""),
            "supplier_name": row.get("supplier_name", ""),
            "supplier_email": row.get("supplier_email", ""),
            "supplier_phone": row.get("supplier_phone", ""),
            "status": row.get("status", "Draft"),
            "items": items if isinstance(items, list) else [],
            "total_cost": number(row.get("total_cost")),
            "received_at": row.get("received_at", ""),
        })
    if orders:
        send("purchase-orders", orders)

    history = []
    for row in read_csv(data_dir / "complete_daily_sales.csv"):
        if row.get("date") and row.get("product_id") is not None:
            history.append({
                "date": row["date"],
                "product_id": str(row["product_id"]),
                "product": row.get("product", ""),
                "category": row.get("category", ""),
                "quantity": number(row.get("quantity")),
            })
    if history:
        send("forecast-history", history)

    print("CSV migration finished. Verify the record counts in MongoDB before deleting old CSV files.")


if __name__ == "__main__":
    main()
