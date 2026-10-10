"""
generate_dataset.py
-------------------
Generates a synthetic e-commerce transactional dataset that mimics
the UCI Online Retail dataset structure. Used when a real dataset
is not available or for local testing.

Columns produced:
    TransactionID  - unique invoice identifier
    CustomerID     - unique customer identifier
    ProductID      - unique product (SKU) identifier
    ProductName    - human-readable product name
    Quantity       - units purchased (negative = cancellation)
    UnitPrice      - price per unit in GBP
    Timestamp      - datetime of transaction
    Country        - customer country
"""

import numpy as np
import pandas as pd
import random
from datetime import datetime, timedelta
import os

# ── Reproducibility ──────────────────────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)

# ── Catalogue ─────────────────────────────────────────────────────────────────
PRODUCTS = [
    ("P001", "Wireless Bluetooth Headphones",  29.99),
    ("P002", "USB-C Charging Cable 3-Pack",      9.99),
    ("P003", "Laptop Stand Adjustable",         34.99),
    ("P004", "Mechanical Keyboard RGB",         79.99),
    ("P005", "Ergonomic Mouse Wireless",        45.99),
    ("P006", "4K Webcam HD",                   89.99),
    ("P007", "Monitor Light Bar",              39.99),
    ("P008", "Cable Management Kit",           14.99),
    ("P009", "Desk Organizer Bamboo",           24.99),
    ("P010", "LED Desk Lamp USB",              32.99),
    ("P011", "Noise Cancelling Earbuds",        49.99),
    ("P012", "Portable Phone Charger 20000mAh", 39.99),
    ("P013", "Smart Watch Fitness Tracker",     99.99),
    ("P014", "Tablet Stand Holder",            19.99),
    ("P015", "Screen Cleaning Kit",             8.99),
    ("P016", "HDMI Cable 6ft",                 12.99),
    ("P017", "USB Hub 7-Port",                 29.99),
    ("P018", "Laptop Backpack 15.6in",          59.99),
    ("P019", "Thermal Paste CPU",               7.99),
    ("P020", "Anti-Blue Light Glasses",         22.99),
    ("P021", "Wrist Rest Keyboard",            16.99),
    ("P022", "Mousepad XL Gaming",             18.99),
    ("P023", "Mini Bluetooth Speaker",          34.99),
    ("P024", "Ring Light 10in Selfie",          42.99),
    ("P025", "External SSD 1TB",              119.99),
    ("P026", "RAM 16GB DDR4",                  69.99),
    ("P027", "Mechanical Pencil Set",           11.99),
    ("P028", "Sticky Notes Multicolor",          5.99),
    ("P029", "Whiteboard Desktop",             27.99),
    ("P030", "Phone Stand Adjustable",         13.99),
]

COUNTRIES = [
    "United Kingdom", "Germany", "France", "Netherlands",
    "Australia", "United States", "Canada", "Spain",
    "Sweden", "Switzerland",
]

# Popularity weights (some products sell much more than others)
POPULARITY = np.array([
    10, 15, 8, 6, 9, 4, 7, 12, 5, 8,
     9, 11, 6, 10, 14, 13, 7, 5, 3, 6,
     8,  7, 9,  5,  4,  3, 6, 11, 4, 9,
], dtype=float)
POPULARITY /= POPULARITY.sum()


def _random_timestamp(start: datetime, end: datetime) -> datetime:
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


def generate_dataset(
    n_customers: int = 1_000,
    n_transactions: int = 25_000,
    cancellation_rate: float = 0.05,
    output_path: str = "data/raw/ecommerce_data.csv",
) -> pd.DataFrame:
    """
    Generate a synthetic e-commerce dataset.

    Parameters
    ----------
    n_customers      : number of unique customers
    n_transactions   : approximate number of transaction line items
    cancellation_rate: fraction of transactions that are cancellations
    output_path      : where to save the CSV

    Returns
    -------
    pd.DataFrame  – raw transactional data
    """
    start_date = datetime(2023, 1, 1)
    end_date   = datetime(2023, 12, 31)

    customer_ids  = [f"C{str(i).zfill(4)}" for i in range(1, n_customers + 1)]
    product_ids   = [p[0] for p in PRODUCTS]
    product_names = {p[0]: p[1] for p in PRODUCTS}
    product_prices= {p[0]: p[2] for p in PRODUCTS}

    # Give each customer a "home country" and a preferred product cluster
    customer_country = {c: random.choice(COUNTRIES) for c in customer_ids}

    records = []
    txn_counter = 1

    # Simulate basket-level purchases (1–5 items per basket)
    while len(records) < n_transactions:
        customer = random.choice(customer_ids)
        basket_ts = _random_timestamp(start_date, end_date)
        invoice = f"INV{str(txn_counter).zfill(6)}"
        is_cancel = random.random() < cancellation_rate
        basket_size = random.randint(1, 5)

        chosen_products = np.random.choice(
            product_ids, size=basket_size, replace=False, p=POPULARITY
        )

        for pid in chosen_products:
            qty = -random.randint(1, 3) if is_cancel else random.randint(1, 6)
            records.append({
                "TransactionID": ("C" if is_cancel else "") + invoice,
                "CustomerID"   : customer,
                "ProductID"    : pid,
                "ProductName"  : product_names[pid],
                "Quantity"     : qty,
                "UnitPrice"    : product_prices[pid],
                "Timestamp"    : basket_ts.strftime("%Y-%m-%d %H:%M:%S"),
                "Country"      : customer_country[customer],
            })

        txn_counter += 1

    df = pd.DataFrame(records)
    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"✅ Dataset saved → {output_path}")
    print(f"   Rows       : {len(df):,}")
    print(f"   Customers  : {df['CustomerID'].nunique():,}")
    print(f"   Products   : {df['ProductID'].nunique():,}")
    print(f"   Date range : {df['Timestamp'].min()} → {df['Timestamp'].max()}")
    return df


if __name__ == "__main__":
    generate_dataset()
