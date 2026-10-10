"""
src/preprocessing/data_processor.py
------------------------------------
Handles all data cleaning, transformation, and feature engineering
steps required before model training.

Pipeline
--------
1. Load raw CSV
2. Drop nulls & duplicates
3. Remove cancelled transactions
4. Remove zero / negative quantities and prices
5. Add derived time features
6. Build user–item interaction matrix (implicit feedback)
7. Save processed artefacts
"""

import os
import logging
from typing import Tuple

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, save_npz
from sklearn.preprocessing import LabelEncoder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
RAW_PATH       = "data/raw/ecommerce_data.csv"
PROCESSED_DIR  = "data/processed"
MATRIX_PATH    = os.path.join(PROCESSED_DIR, "interaction_matrix.npz")
ENCODER_C_PATH = os.path.join(PROCESSED_DIR, "customer_encoder.npy")
ENCODER_P_PATH = os.path.join(PROCESSED_DIR, "product_encoder.npy")
CLEAN_CSV_PATH = os.path.join(PROCESSED_DIR, "clean_transactions.csv")


# ─────────────────────────────────────────────────────────────────────────────
class DataProcessor:
    """
    Full preprocessing pipeline for the e-commerce recommendation system.

    Attributes
    ----------
    df             : cleaned transaction DataFrame
    interaction_df : aggregated user–item interaction scores
    matrix         : sparse user–item matrix (CSR format)
    customer_enc   : LabelEncoder for CustomerID → integer index
    product_enc    : LabelEncoder for ProductID  → integer index
    """

    def __init__(self, raw_path: str = RAW_PATH):
        self.raw_path = raw_path
        self.df: pd.DataFrame            = pd.DataFrame()
        self.interaction_df: pd.DataFrame= pd.DataFrame()
        self.matrix: csr_matrix          = csr_matrix((0, 0))
        self.customer_enc                = LabelEncoder()
        self.product_enc                 = LabelEncoder()

    # ── 1. Load ───────────────────────────────────────────────────────────────
    def load(self) -> "DataProcessor":
        logger.info("Loading raw data from %s …", self.raw_path)
        self.df = pd.read_csv(self.raw_path, parse_dates=["Timestamp"])
        logger.info("Loaded %d rows, %d columns", *self.df.shape)
        return self

    # ── 2. Clean ──────────────────────────────────────────────────────────────
    def clean(self) -> "DataProcessor":
        df = self.df.copy()
        original = len(df)

        # Drop rows with missing essential columns
        essential = ["CustomerID", "ProductID", "Quantity", "UnitPrice"]
        df.dropna(subset=essential, inplace=True)
        logger.info("After dropping nulls: %d rows (-%d)", len(df), original - len(df))

        # Remove cancellations (TransactionID starts with 'C')
        mask_cancel = df["TransactionID"].astype(str).str.startswith("C")
        df = df[~mask_cancel]
        logger.info("After removing cancellations: %d rows", len(df))

        # Keep only positive quantity and price
        df = df[(df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
        logger.info("After removing non-positive qty/price: %d rows", len(df))

        # Drop exact duplicates
        before_dedup = len(df)
        df.drop_duplicates(inplace=True)
        logger.info("Dropped %d duplicate rows", before_dedup - len(df))

        # Cast types
        df["CustomerID"] = df["CustomerID"].astype(str).str.strip()
        df["ProductID"]  = df["ProductID"].astype(str).str.strip()
        df["Timestamp"]  = pd.to_datetime(df["Timestamp"])

        self.df = df.reset_index(drop=True)
        return self

    # ── 3. Feature Engineering ────────────────────────────────────────────────
    def engineer_features(self) -> "DataProcessor":
        df = self.df.copy()

        # Time features
        df["Year"]       = df["Timestamp"].dt.year
        df["Month"]      = df["Timestamp"].dt.month
        df["DayOfWeek"]  = df["Timestamp"].dt.dayofweek   # 0=Monday
        df["Hour"]       = df["Timestamp"].dt.hour
        df["IsWeekend"]  = df["DayOfWeek"].isin([5, 6]).astype(int)

        # Revenue per line
        df["Revenue"] = df["Quantity"] * df["UnitPrice"]

        # Customer-level aggregates
        cust_stats = (
            df.groupby("CustomerID")
            .agg(
                TotalOrders      =("TransactionID", "nunique"),
                TotalItems       =("Quantity",      "sum"),
                TotalSpend       =("Revenue",       "sum"),
                AvgBasketSize    =("Quantity",      "mean"),
                UniqueProducts   =("ProductID",     "nunique"),
            )
            .reset_index()
        )
        df = df.merge(cust_stats, on="CustomerID", how="left")

        # Product-level aggregates
        prod_stats = (
            df.groupby("ProductID")
            .agg(
                ProductPopularity =("Quantity",    "sum"),
                ProductRevenue    =("Revenue",     "sum"),
                UniqueCustomers   =("CustomerID",  "nunique"),
            )
            .reset_index()
        )
        df = df.merge(prod_stats, on="ProductID", how="left")

        self.df = df.reset_index(drop=True)
        logger.info("Feature engineering complete. Shape: %s", self.df.shape)
        return self

    # ── 4. Interaction Matrix ─────────────────────────────────────────────────
    def build_interaction_matrix(self) -> "DataProcessor":
        """
        Aggregate purchase quantities per (Customer, Product) pair and
        build a sparse CSR matrix suitable for collaborative filtering.

        Interaction score = total units purchased (implicit feedback).
        """
        logger.info("Building user–item interaction matrix …")

        agg = (
            self.df.groupby(["CustomerID", "ProductID"])["Quantity"]
            .sum()
            .reset_index()
            .rename(columns={"Quantity": "InteractionScore"})
        )

        # Apply log(1 + x) smoothing to reduce influence of bulk buyers
        agg["InteractionScore"] = np.log1p(agg["InteractionScore"])

        self.interaction_df = agg

        # Encode IDs → integer indices
        self.customer_enc.fit(agg["CustomerID"])
        self.product_enc.fit(agg["ProductID"])

        row = self.customer_enc.transform(agg["CustomerID"])
        col = self.product_enc.transform(agg["ProductID"])
        val = agg["InteractionScore"].values.astype(np.float32)

        n_users    = len(self.customer_enc.classes_)
        n_products = len(self.product_enc.classes_)
        self.matrix = csr_matrix((val, (row, col)), shape=(n_users, n_products))

        logger.info(
            "Matrix shape: %d users × %d products | density: %.4f%%",
            n_users,
            n_products,
            100.0 * self.matrix.nnz / (n_users * n_products),
        )
        return self

    # ── 5. Persist ────────────────────────────────────────────────────────────
    def save(self) -> "DataProcessor":
        os.makedirs(PROCESSED_DIR, exist_ok=True)

        self.df.to_csv(CLEAN_CSV_PATH, index=False)
        save_npz(MATRIX_PATH, self.matrix)
        np.save(ENCODER_C_PATH, self.customer_enc.classes_)
        np.save(ENCODER_P_PATH, self.product_enc.classes_)

        logger.info("Saved clean CSV     → %s", CLEAN_CSV_PATH)
        logger.info("Saved sparse matrix → %s", MATRIX_PATH)
        logger.info("Saved customer enc  → %s", ENCODER_C_PATH)
        logger.info("Saved product enc   → %s", ENCODER_P_PATH)
        return self

    # ── Convenience wrapper ───────────────────────────────────────────────────
    def run_pipeline(self) -> "DataProcessor":
        """Execute the full preprocessing pipeline end-to-end."""
        return (
            self.load()
                .clean()
                .engineer_features()
                .build_interaction_matrix()
                .save()
        )

    # ── Helpers ───────────────────────────────────────────────────────────────
    def get_product_map(self) -> dict:
        """Return a mapping {ProductID: ProductName}."""
        return (
            self.df[["ProductID", "ProductName"]]
            .drop_duplicates("ProductID")
            .set_index("ProductID")["ProductName"]
            .to_dict()
        )

    def get_customer_product_history(self, customer_id: str) -> list:
        """Return list of ProductIDs purchased by a given customer."""
        mask = self.df["CustomerID"] == customer_id
        return self.df.loc[mask, "ProductID"].unique().tolist()


# ── CLI entry-point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    processor = DataProcessor()
    processor.run_pipeline()
    print("\n✅ Preprocessing complete.")
    print(f"   Clean rows     : {len(processor.df):,}")
    print(f"   Unique customers: {processor.df['CustomerID'].nunique():,}")
    print(f"   Unique products : {processor.df['ProductID'].nunique():,}")
    print(f"   Matrix density  : {100.0 * processor.matrix.nnz / (processor.matrix.shape[0] * processor.matrix.shape[1]):.4f}%")
