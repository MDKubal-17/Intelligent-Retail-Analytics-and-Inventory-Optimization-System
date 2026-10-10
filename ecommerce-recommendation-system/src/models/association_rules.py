"""
src/models/association_rules.py
--------------------------------
Market Basket Analysis using the Apriori algorithm.

Generates rules of the form:
    "If a customer buys {A}, they are likely to also buy {B}"

Key metrics
-----------
Support    : P(A ∩ B) — how often the itemset appears overall
Confidence : P(B|A)   — how often B appears when A appears
Lift       : confidence / P(B) — strength above random chance
             Lift > 1  ➜ positive association
             Lift ≈ 1  ➜ independence
             Lift < 1  ➜ negative association
"""

import logging
import os
import pickle
from typing import List, Dict, Tuple

import pandas as pd
import numpy as np

try:
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder
    MLXTEND_AVAILABLE = True
except ImportError:
    MLXTEND_AVAILABLE = False
    logging.warning("mlxtend not installed. Association rules disabled.")

logger = logging.getLogger(__name__)


class AssociationRuleModel:
    """
    Wraps mlxtend Apriori + association_rules with convenient helpers.

    Attributes
    ----------
    rules        : DataFrame of mined rules
    frequent_sets: DataFrame of frequent itemsets
    """

    def __init__(
        self,
        min_support    : float = 0.02,
        min_confidence : float = 0.20,
        min_lift       : float = 1.0,
        max_len        : int   = 4,
    ):
        if not MLXTEND_AVAILABLE:
            raise ImportError(
                "mlxtend is required. Install with: pip install mlxtend"
            )
        self.min_support    = min_support
        self.min_confidence = min_confidence
        self.min_lift       = min_lift
        self.max_len        = max_len

        self.rules           = pd.DataFrame()
        self.frequent_sets   = pd.DataFrame()
        self.te              = None      # TransactionEncoder

    # ── Fit ───────────────────────────────────────────────────────────────────
    def fit(self, transactions_df: pd.DataFrame) -> "AssociationRuleModel":
        """
        Mine association rules from transaction data.

        Parameters
        ----------
        transactions_df : DataFrame with at least ['TransactionID', 'ProductID']
        """
        logger.info("Building baskets for Apriori …")

        # Build list-of-sets basket format
        baskets = (
            transactions_df
            .groupby("TransactionID")["ProductID"]
            .apply(list)
            .tolist()
        )

        logger.info("Total baskets: %d", len(baskets))

        # Encode
        self.te = TransactionEncoder()
        te_array = self.te.fit_transform(baskets)
        basket_df = pd.DataFrame(te_array, columns=self.te.columns_)

        # Mine frequent itemsets
        logger.info(
            "Running Apriori (min_support=%.3f, max_len=%d) …",
            self.min_support, self.max_len,
        )
        self.frequent_sets = apriori(
            basket_df,
            min_support=self.min_support,
            use_colnames=True,
            max_len=self.max_len,
        )
        logger.info("Frequent itemsets found: %d", len(self.frequent_sets))

        if self.frequent_sets.empty:
            logger.warning(
                "No frequent itemsets found. Try lowering min_support (current: %.3f)",
                self.min_support,
            )
            return self

        # Generate rules
        self.rules = association_rules(
            self.frequent_sets,
            metric="lift",
            min_threshold=self.min_lift,
        )
        # Apply confidence filter
        self.rules = self.rules[self.rules["confidence"] >= self.min_confidence]
        self.rules = self.rules.sort_values("lift", ascending=False).reset_index(drop=True)

        logger.info(
            "Rules generated: %d (after confidence ≥ %.2f filter)",
            len(self.rules), self.min_confidence,
        )
        return self

    # ── "Customers also bought" ───────────────────────────────────────────────
    def get_also_bought(
        self,
        product_id: str,
        n: int = 5,
    ) -> List[Dict]:
        """
        Return products frequently purchased together with product_id.

        Parameters
        ----------
        product_id : antecedent product
        n          : max rules to return

        Returns
        -------
        List of dicts with keys: product_id, confidence, lift, support
        """
        if self.rules.empty:
            return []

        # Filter rules where product_id is in antecedents
        mask = self.rules["antecedents"].apply(lambda s: product_id in s)
        matched = self.rules[mask].head(n)

        results = []
        for _, row in matched.iterrows():
            for pid in row["consequents"]:
                results.append({
                    "product_id": pid,
                    "confidence": round(row["confidence"], 4),
                    "lift"      : round(row["lift"],       4),
                    "support"   : round(row["support"],    4),
                })
        return results[:n]

    def get_basket_recommendations(
        self,
        basket: List[str],
        n: int = 5,
    ) -> List[Dict]:
        """
        Given a current basket of products, recommend what to add.
        Matches rules where the antecedent is a subset of the basket.
        """
        if self.rules.empty:
            return []

        basket_set = set(basket)
        mask = self.rules["antecedents"].apply(lambda s: s.issubset(basket_set))
        matched = self.rules[mask]

        # Exclude products already in basket
        results = []
        seen = set()
        for _, row in matched.iterrows():
            for pid in row["consequents"]:
                if pid not in basket_set and pid not in seen:
                    results.append({
                        "product_id": pid,
                        "confidence": round(row["confidence"], 4),
                        "lift"      : round(row["lift"],       4),
                        "support"   : round(row["support"],    4),
                    })
                    seen.add(pid)

        # Sort by lift
        results.sort(key=lambda x: x["lift"], reverse=True)
        return results[:n]

    def top_rules_summary(self, n: int = 10) -> pd.DataFrame:
        """Return the top-n rules by lift as a readable DataFrame."""
        if self.rules.empty:
            return pd.DataFrame()

        summary = self.rules.head(n)[
            ["antecedents", "consequents", "support", "confidence", "lift"]
        ].copy()
        summary["antecedents"]  = summary["antecedents"].apply(lambda s: ", ".join(sorted(s)))
        summary["consequents"]  = summary["consequents"].apply(lambda s: ", ".join(sorted(s)))
        return summary

    # ── Persistence ───────────────────────────────────────────────────────────
    def save(self, path: str = "models/saved/association_rules.pkl"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self, f)
        logger.info("AssociationRuleModel saved → %s", path)

    @classmethod
    def load(cls, path: str) -> "AssociationRuleModel":
        with open(path, "rb") as f:
            obj = pickle.load(f)
        logger.info("AssociationRuleModel loaded ← %s", path)
        return obj


# ── CLI entry-point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    df = pd.read_csv("data/processed/clean_transactions.csv")

    model = AssociationRuleModel(
        min_support=0.02,
        min_confidence=0.15,
        min_lift=1.0,
    )
    model.fit(df)

    print("\n── Top 10 Association Rules ────────────────────────────────────────")
    print(model.top_rules_summary(10).to_string(index=False))

    # Demo
    sample_product = df["ProductID"].value_counts().index[0]
    print(f"\n── 'Also Bought' for {sample_product} ─────────────────────────────")
    for rec in model.get_also_bought(sample_product):
        print(f"  {rec['product_id']}  conf={rec['confidence']:.2f}  lift={rec['lift']:.2f}")

    model.save()
    print("\n✅ Association rules model saved.")
