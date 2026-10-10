"""
src/evaluation/metrics.py
--------------------------
Evaluation metrics for recommendation systems.

Metrics implemented
-------------------
Precision@K  — fraction of top-K recs that are relevant
Recall@K     — fraction of relevant items captured in top-K
F1@K         — harmonic mean of Precision@K and Recall@K
NDCG@K       — normalised discounted cumulative gain (ranking quality)
Hit Rate@K   — fraction of users for whom ≥1 relevant item is in top-K
MRR          — mean reciprocal rank of the first relevant item
Coverage     — fraction of catalogue that appears in recommendations
"""

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix

logger = logging.getLogger(__name__)


# ── Item-level metrics ────────────────────────────────────────────────────────

def precision_at_k(recommended: List[str], relevant: List[str], k: int) -> float:
    """P@K = (# relevant in top-K) / K"""
    if k == 0:
        return 0.0
    top_k     = set(recommended[:k])
    relevant_s= set(relevant)
    return len(top_k & relevant_s) / k


def recall_at_k(recommended: List[str], relevant: List[str], k: int) -> float:
    """R@K = (# relevant in top-K) / |relevant|"""
    if not relevant:
        return 0.0
    top_k     = set(recommended[:k])
    relevant_s= set(relevant)
    return len(top_k & relevant_s) / len(relevant_s)


def f1_at_k(recommended: List[str], relevant: List[str], k: int) -> float:
    p = precision_at_k(recommended, relevant, k)
    r = recall_at_k(recommended, relevant, k)
    if p + r == 0:
        return 0.0
    return 2 * p * r / (p + r)


def ndcg_at_k(recommended: List[str], relevant: List[str], k: int) -> float:
    """
    NDCG@K — rewards correct items ranked higher.
    Uses binary relevance (item is either relevant or not).
    """
    relevant_s = set(relevant)
    dcg = sum(
        1.0 / np.log2(i + 2)        # i is 0-indexed, log2(rank+1)
        for i, item in enumerate(recommended[:k])
        if item in relevant_s
    )
    # Ideal DCG: all relevant items at top
    ideal_hits = min(k, len(relevant_s))
    idcg = sum(1.0 / np.log2(i + 2) for i in range(ideal_hits))
    return dcg / idcg if idcg > 0 else 0.0


def hit_rate(recommended: List[str], relevant: List[str], k: int) -> float:
    """1 if at least one relevant item is in top-K, else 0."""
    return float(bool(set(recommended[:k]) & set(relevant)))


def reciprocal_rank(recommended: List[str], relevant: List[str]) -> float:
    """1 / rank of the first relevant item; 0 if not found."""
    relevant_s = set(relevant)
    for i, item in enumerate(recommended, start=1):
        if item in relevant_s:
            return 1.0 / i
    return 0.0


# ── Population-level evaluation ───────────────────────────────────────────────

class RecommenderEvaluator:
    """
    Evaluates a recommendation model using leave-one-out or
    temporal train/test split.

    Parameters
    ----------
    k_values : list of K values to evaluate (e.g. [5, 10, 20])
    """

    def __init__(self, k_values: List[int] = None):
        self.k_values = k_values or [5, 10, 20]

    def train_test_split(
        self,
        df            : pd.DataFrame,
        strategy      : str   = "temporal",   # "temporal" | "leave_one_out"
        test_fraction : float = 0.20,
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split transactions into train and test sets.

        temporal        : most recent `test_fraction` of each user's purchases → test
        leave_one_out   : last purchase per user → test
        """
        df = df.sort_values("Timestamp")

        if strategy == "leave_one_out":
            last_idx = df.groupby("CustomerID").apply(lambda g: g.index[-1])
            test     = df.loc[last_idx].reset_index(drop=True)
            train    = df.drop(index=last_idx).reset_index(drop=True)
        else:
            # For each customer, take the last test_fraction rows as test
            test_indices = []
            for _, grp in df.groupby("CustomerID"):
                n_test = max(1, int(len(grp) * test_fraction))
                test_indices.extend(grp.index[-n_test:].tolist())
            test  = df.loc[test_indices].reset_index(drop=True)
            train = df.drop(index=test_indices).reset_index(drop=True)

        logger.info(
            "Train: %d rows | Test: %d rows | Strategy: %s",
            len(train), len(test), strategy,
        )
        return train.reset_index(drop=True), test.reset_index(drop=True)

    def evaluate_model(
        self,
        recommend_fn,                    # Callable: customer_id → List[str] product IDs
        test_df      : pd.DataFrame,
        max_users    : int = 500,        # limit for speed
    ) -> pd.DataFrame:
        """
        Evaluate a recommendation function against the test set.

        Parameters
        ----------
        recommend_fn : function taking (customer_id: str, n: int) → List[str]
        test_df      : held-out transactions (CustomerID, ProductID)
        max_users    : cap to avoid very long evaluations

        Returns
        -------
        DataFrame of per-K aggregate metrics
        """
        # Build ground-truth: {customer_id: [product_ids]}
        ground_truth: Dict[str, List[str]] = (
            test_df.groupby("CustomerID")["ProductID"]
            .apply(list)
            .to_dict()
        )

        customers = list(ground_truth.keys())[:max_users]
        max_k     = max(self.k_values)

        results = {k: {"precision": [], "recall": [], "f1": [], "ndcg": [], "hit_rate": []}
                   for k in self.k_values}
        mrr_list = []

        for cid in customers:
            relevant  = ground_truth[cid]
            try:
                recs = recommend_fn(cid, n=max_k)
                rec_ids = [r if isinstance(r, str) else r[0] for r in recs]
            except Exception as e:
                logger.debug("Skipping %s: %s", cid, e)
                continue

            mrr_list.append(reciprocal_rank(rec_ids, relevant))

            for k in self.k_values:
                results[k]["precision"] .append(precision_at_k(rec_ids, relevant, k))
                results[k]["recall"]    .append(recall_at_k   (rec_ids, relevant, k))
                results[k]["f1"]        .append(f1_at_k       (rec_ids, relevant, k))
                results[k]["ndcg"]      .append(ndcg_at_k     (rec_ids, relevant, k))
                results[k]["hit_rate"]  .append(hit_rate      (rec_ids, relevant, k))

        # Aggregate
        rows = []
        for k in self.k_values:
            row = {"K": k}
            for metric, vals in results[k].items():
                row[metric.capitalize() + f"@{k}"] = round(float(np.mean(vals)), 6) if vals else 0.0
            rows.append(row)

        summary = pd.DataFrame(rows)
        summary["MRR"] = round(float(np.mean(mrr_list)), 6) if mrr_list else 0.0
        summary["n_users_evaluated"] = len(customers)
        return summary

    def coverage(
        self,
        recommend_fn,
        all_product_ids: List[str],
        sample_users   : List[str],
        n              : int = 10,
    ) -> float:
        """
        Catalogue coverage = fraction of all products that appear
        in recommendations across sample_users.
        """
        seen = set()
        for cid in sample_users:
            try:
                recs = recommend_fn(cid, n=n)
                rec_ids = [r if isinstance(r, str) else r[0] for r in recs]
                seen.update(rec_ids)
            except Exception:
                pass
        return len(seen) / len(all_product_ids) if all_product_ids else 0.0


# ── Pretty print ─────────────────────────────────────────────────────────────

def print_evaluation_report(summary: pd.DataFrame, model_name: str = "Model"):
    """Print a nicely formatted evaluation report."""
    separator = "─" * 60
    print(f"\n{separator}")
    print(f"  📊  {model_name} Evaluation Report")
    print(separator)
    # Rotate to wide format for display
    cols_to_show = [c for c in summary.columns if c not in ["n_users_evaluated", "MRR"]]
    print(summary[cols_to_show].to_string(index=False))
    if "MRR" in summary.columns:
        print(f"\n  MRR (Mean Reciprocal Rank) : {summary['MRR'].iloc[0]:.6f}")
    if "n_users_evaluated" in summary.columns:
        print(f"  Users evaluated            : {summary['n_users_evaluated'].iloc[0]}")
    print(separator)
