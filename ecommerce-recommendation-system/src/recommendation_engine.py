"""
src/recommendation_engine.py 
-----------------------------
Unified Recommendation Engine that orchestrates all underlying models
(UserUserCF, ItemItemCF, AssociationRules, ALS) and exposes a clean API
consumed by the Flask REST layer and the Streamlit front-end.

Design pattern: Strategy + Facade
  • Each algorithm is a "strategy" that can be swapped in/out.
  • This class acts as a facade, hiding implementation details from callers.
"""

import logging
import os
import pickle
from typing import List, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, load_npz
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

# ── Default paths ─────────────────────────────────────────────────────────────
PATHS = {
    "matrix"       : "data/processed/interaction_matrix.npz",
    "cust_enc"     : "data/processed/customer_encoder.npy",
    "prod_enc"     : "data/processed/product_encoder.npy",
    "clean_csv"    : "data/processed/clean_transactions.csv",
    "uu_cf"        : "models/saved/uu_cf.pkl",
    "ii_cf"        : "models/saved/ii_cf.pkl",
    "als"          : "models/saved/als_model.pkl",
    "rules"        : "models/saved/association_rules.pkl",
}


class RecommendationEngine:
    """
    Single entry-point for all recommendation use-cases.

    Usage
    -----
    engine = RecommendationEngine().load()

    # For a user
    engine.recommend_for_user("C0001", n=10)

    # Similar products ("You may also like")
    engine.similar_products("P005", n=6)

    # "Customers also bought"
    engine.customers_also_bought("P005", n=5)
    """

    def __init__(self):
        self.matrix      : Optional[csr_matrix]    = None
        self.customer_enc: Optional[LabelEncoder]   = None
        self.product_enc : Optional[LabelEncoder]   = None
        self.df          : Optional[pd.DataFrame]   = None

        self.uu_cf  = None
        self.ii_cf  = None
        self.als    = None
        self.rules  = None

        self._product_map: Dict[str, str] = {}   # {ProductID: ProductName}

    # ── Bootstrap ─────────────────────────────────────────────────────────────
    def load(self, paths: dict = None) -> "RecommendationEngine":
        """Load all pre-trained models and data artefacts from disk."""
        p = paths or PATHS
        logger.info("Loading RecommendationEngine artefacts …")

        # Interaction matrix + encoders
        self.matrix       = load_npz(p["matrix"])
        cust_cls          = np.load(p["cust_enc"], allow_pickle=True)
        prod_cls          = np.load(p["prod_enc"], allow_pickle=True)
        self.customer_enc = LabelEncoder(); self.customer_enc.classes_ = cust_cls
        self.product_enc  = LabelEncoder(); self.product_enc.classes_  = prod_cls

        # Clean transactions (for product names and fallback logic)
        self.df = pd.read_csv(p["clean_csv"])
        self._product_map = (
            self.df[["ProductID", "ProductName"]]
            .drop_duplicates("ProductID")
            .set_index("ProductID")["ProductName"]
            .to_dict()
        )

        # Models
        self.uu_cf = self._load_model(p["uu_cf"], "UserUserCF")
        self.ii_cf = self._load_model(p["ii_cf"], "ItemItemCF")
        self.als   = self._load_model(p["als"],   "ALS")
        self.rules = self._load_model(p["rules"], "AssociationRules")

        logger.info("RecommendationEngine ready.")
        return self

    @staticmethod
    def _load_model(path: str, name: str):
        if not os.path.exists(path):
            logger.warning("%s model not found at %s", name, path)
            return None
        with open(path, "rb") as f:
            model = pickle.load(f)
        logger.info("%s loaded ← %s", name, path)
        return model

    # ── Core APIs ─────────────────────────────────────────────────────────────
    def recommend_for_user(
        self,
        customer_id: str,
        n          : int = 10,
        method     : str = "als",   # "als" | "uu_cf" | "ii_cf" | "hybrid"
    ) -> List[Dict]:
        """
        Recommend products for a specific user.

        Parameters
        ----------
        customer_id : target customer
        n           : number of recommendations
        method      : which algorithm to use (als | uu_cf | ii_cf | hybrid)

        Returns
        -------
        List of dicts: {product_id, product_name, score, rank}
        """
        raw: List[Tuple[str, float]] = []

        if method == "als" and self.als:
            raw = self.als.recommend(customer_id, n=n)

        elif method == "uu_cf" and self.uu_cf:
            raw = self.uu_cf.recommend(customer_id, n=n)

        elif method == "ii_cf" and self.ii_cf:
            raw = self.ii_cf.recommend(customer_id, n=n)

        elif method == "hybrid":
            raw = self._hybrid_user_recs(customer_id, n=n)

        else:
            # Fallback: ALS → UU-CF → II-CF → popular
            for model, attr in [(self.als, "als"), (self.uu_cf, "uu_cf"), (self.ii_cf, "ii_cf")]:
                if model:
                    raw = model.recommend(customer_id, n=n)
                    if raw:
                        break
            if not raw:
                raw = self._popular_products(n)

        return self._format_results(raw)

    def similar_products(
        self,
        product_id: str,
        n         : int = 8,
        method    : str = "ii_cf",   # "ii_cf" | "als"
    ) -> List[Dict]:
        """
        Return products similar to the given product ("You may also like").

        Parameters
        ----------
        product_id : seed product
        n          : number of similar products
        method     : "ii_cf" | "als"
        """
        raw: List[Tuple[str, float]] = []

        if method == "als" and self.als:
            raw = self.als.get_similar_products(product_id, n=n)

        elif method == "ii_cf" and self.ii_cf:
            raw = self.ii_cf.get_similar_products(product_id, n=n)

        if not raw and self.ii_cf:
            raw = self.ii_cf.get_similar_products(product_id, n=n)

        return self._format_results(raw)

    def customers_also_bought(
        self,
        product_id: str,
        n         : int = 5,
    ) -> List[Dict]:
        """
        Return "Customers who bought X also bought …" section.
        Uses association rules for interpretable confidence/lift scores,
        falls back to item-item CF similarity.
        """
        if self.rules:
            raw_rules = self.rules.get_also_bought(product_id, n=n)
            if raw_rules:
                return [
                    {
                        "product_id"  : r["product_id"],
                        "product_name": self._product_map.get(r["product_id"], r["product_id"]),
                        "confidence"  : r["confidence"],
                        "lift"        : r["lift"],
                        "score"       : round(r["confidence"] * r["lift"], 4),
                        "rank"        : i + 1,
                    }
                    for i, r in enumerate(raw_rules)
                ]

        # Fallback to item-item CF
        return self.similar_products(product_id, n=n)

    def basket_recommendations(
        self,
        basket: List[str],
        n     : int = 5,
    ) -> List[Dict]:
        """
        Recommend items to add to the current basket.
        Uses association rules with basket as antecedent.
        """
        if self.rules:
            raw = self.rules.get_basket_recommendations(basket, n=n)
            return [
                {
                    "product_id"  : r["product_id"],
                    "product_name": self._product_map.get(r["product_id"], r["product_id"]),
                    "confidence"  : r["confidence"],
                    "lift"        : r["lift"],
                    "score"       : round(r["confidence"] * r["lift"], 4),
                    "rank"        : i + 1,
                }
                for i, r in enumerate(raw)
            ]
        return []

    def get_user_history(self, customer_id: str) -> List[Dict]:
        """Return purchased products for a customer."""
        mask = self.df["CustomerID"] == customer_id
        hist = (
            self.df.loc[mask, ["ProductID", "ProductName", "Quantity"]]
            .groupby(["ProductID", "ProductName"])["Quantity"]
            .sum()
            .reset_index()
            .sort_values("Quantity", ascending=False)
        )
        return hist.to_dict(orient="records")

    # ── Hybrid model ──────────────────────────────────────────────────────────
    def _hybrid_user_recs(
        self, customer_id: str, n: int = 10, weights=(0.5, 0.3, 0.2)
    ) -> List[Tuple[str, float]]:
        """
        Weighted blend of ALS + UU-CF + II-CF scores.
        Normalise each model's scores to [0,1] before blending.
        """
        from collections import defaultdict

        score_map: Dict[str, float] = defaultdict(float)
        w_als, w_uu, w_ii = weights

        def _add(recs, weight):
            if not recs:
                return
            max_s = max(s for _, s in recs) or 1.0
            for pid, s in recs:
                score_map[pid] += weight * (s / max_s)

        if self.als:
            _add(self.als.recommend(customer_id, n=n * 2), w_als)
        if self.uu_cf:
            _add(self.uu_cf.recommend(customer_id, n=n * 2), w_uu)
        if self.ii_cf:
            _add(self.ii_cf.recommend(customer_id, n=n * 2), w_ii)

        sorted_recs = sorted(score_map.items(), key=lambda x: -x[1])
        return sorted_recs[:n]

    # ── Popular products fallback ─────────────────────────────────────────────
    def _popular_products(self, n: int = 10) -> List[Tuple[str, float]]:
        """Return top-n products by overall purchase frequency."""
        pop = (
            self.df.groupby("ProductID")["Quantity"]
            .sum()
            .nlargest(n)
        )
        max_val = pop.max() or 1.0
        return [(pid, float(qty / max_val)) for pid, qty in pop.items()]

    # ── Formatting ────────────────────────────────────────────────────────────
    def _format_results(self, raw: List[Tuple[str, float]]) -> List[Dict]:
        return [
            {
                "product_id"  : pid,
                "product_name": self._product_map.get(pid, pid),
                "score"       : round(float(score), 6),
                "rank"        : rank,
            }
            for rank, (pid, score) in enumerate(raw, start=1)
        ]

    # ── Meta ──────────────────────────────────────────────────────────────────
    def product_name(self, product_id: str) -> str:
        return self._product_map.get(product_id, product_id)

    def all_products(self) -> List[Dict]:
        return [
            {"product_id": pid, "product_name": name}
            for pid, name in sorted(self._product_map.items())
        ]

    def all_customers(self) -> List[str]:
        return sorted(self.customer_enc.classes_.tolist())
