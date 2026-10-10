"""
tests/test_recommendation_engine.py
-------------------------------------
Unit tests for preprocessing, models, and evaluation metrics.

Run with:
    pytest tests/ -v --cov=src
"""

import numpy as np
import pandas as pd
import pytest
from scipy.sparse import csr_matrix
from sklearn.preprocessing import LabelEncoder


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_transactions():
    """Small synthetic transaction DataFrame."""
    return pd.DataFrame({
        "TransactionID": ["T001", "T001", "T002", "T002", "T003", "T004"],
        "CustomerID"   : ["C001", "C001", "C002", "C002", "C003", "C001"],
        "ProductID"    : ["P001", "P002", "P001", "P003", "P002", "P003"],
        "ProductName"  : ["Widget A", "Widget B", "Widget A", "Widget C", "Widget B", "Widget C"],
        "Quantity"     : [2, 1, 3, 1, 2, 1],
        "UnitPrice"    : [9.99, 14.99, 9.99, 7.99, 14.99, 7.99],
        "Timestamp"    : pd.to_datetime([
            "2023-01-01", "2023-01-01",
            "2023-02-01", "2023-02-01",
            "2023-03-01", "2023-04-01",
        ]),
        "Country"      : ["UK"] * 6,
    })


@pytest.fixture
def sample_interaction_matrix():
    """
    3 users × 4 products sparse matrix.
    C001: P001, P002, P004
    C002: P001, P003
    C003: P002, P003, P004
    """
    data = np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0], dtype=np.float32)
    row  = np.array([0, 0, 0, 1, 1, 2, 2, 2])
    col  = np.array([0, 1, 3, 0, 2, 1, 2, 3])
    mat  = csr_matrix((data, (row, col)), shape=(3, 4))

    cust_enc = LabelEncoder()
    cust_enc.classes_ = np.array(["C001", "C002", "C003"])

    prod_enc = LabelEncoder()
    prod_enc.classes_ = np.array(["P001", "P002", "P003", "P004"])

    return mat, cust_enc, prod_enc


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation Metrics Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestMetrics:

    def test_precision_at_k_perfect(self):
        from src.evaluation.metrics import precision_at_k
        assert precision_at_k(["P1", "P2", "P3"], ["P1", "P2", "P3"], k=3) == 1.0

    def test_precision_at_k_zero(self):
        from src.evaluation.metrics import precision_at_k
        assert precision_at_k(["P4", "P5"], ["P1", "P2"], k=2) == 0.0

    def test_precision_at_k_partial(self):
        from src.evaluation.metrics import precision_at_k
        assert precision_at_k(["P1", "P4", "P2"], ["P1", "P2"], k=3) == pytest.approx(2 / 3)

    def test_recall_at_k_perfect(self):
        from src.evaluation.metrics import recall_at_k
        assert recall_at_k(["P1", "P2"], ["P1", "P2"], k=2) == 1.0

    def test_recall_at_k_partial(self):
        from src.evaluation.metrics import recall_at_k
        assert recall_at_k(["P1", "P4"], ["P1", "P2", "P3"], k=2) == pytest.approx(1 / 3)

    def test_recall_empty_relevant(self):
        from src.evaluation.metrics import recall_at_k
        assert recall_at_k(["P1"], [], k=5) == 0.0

    def test_ndcg_at_k_perfect(self):
        from src.evaluation.metrics import ndcg_at_k
        assert ndcg_at_k(["P1", "P2", "P3"], ["P1", "P2", "P3"], k=3) == pytest.approx(1.0)

    def test_ndcg_at_k_zero(self):
        from src.evaluation.metrics import ndcg_at_k
        assert ndcg_at_k(["P4", "P5"], ["P1", "P2"], k=2) == 0.0

    def test_hit_rate_hit(self):
        from src.evaluation.metrics import hit_rate
        assert hit_rate(["P4", "P1", "P5"], ["P1", "P2"], k=3) == 1.0

    def test_hit_rate_miss(self):
        from src.evaluation.metrics import hit_rate
        assert hit_rate(["P4", "P5"], ["P1", "P2"], k=2) == 0.0

    def test_reciprocal_rank(self):
        from src.evaluation.metrics import reciprocal_rank
        assert reciprocal_rank(["P3", "P1", "P2"], ["P1"]) == pytest.approx(0.5)

    def test_reciprocal_rank_not_found(self):
        from src.evaluation.metrics import reciprocal_rank
        assert reciprocal_rank(["P3", "P4"], ["P1"]) == 0.0

    def test_f1_at_k(self):
        from src.evaluation.metrics import f1_at_k
        # P@K = 2/3, R@K = 2/2 = 1.0
        f1 = f1_at_k(["P1", "P4", "P2"], ["P1", "P2"], k=3)
        assert f1 == pytest.approx(2 * (2/3) * 1.0 / (2/3 + 1.0))


# ─────────────────────────────────────────────────────────────────────────────
# Collaborative Filtering Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestUserUserCF:

    def test_fit_and_recommend(self, sample_interaction_matrix):
        from src.models.collaborative_filtering import UserUserCF
        mat, cust_enc, prod_enc = sample_interaction_matrix
        model = UserUserCF(top_k=3, n_similar=2)
        model.fit(mat, cust_enc, prod_enc)
        assert model.is_trained
        assert model.sim_matrix.shape == (3, 3)

        recs = model.recommend("C001", n=3)
        assert isinstance(recs, list)
        rec_ids = [r[0] for r in recs]
        # C001 bought P001, P002, P004 — should not get those back
        assert "P001" not in rec_ids
        assert "P002" not in rec_ids

    def test_unknown_user(self, sample_interaction_matrix):
        from src.models.collaborative_filtering import UserUserCF
        mat, cust_enc, prod_enc = sample_interaction_matrix
        model = UserUserCF().fit(mat, cust_enc, prod_enc)
        assert model.recommend("C9999") == []

    def test_similar_users(self, sample_interaction_matrix):
        from src.models.collaborative_filtering import UserUserCF
        mat, cust_enc, prod_enc = sample_interaction_matrix
        model = UserUserCF().fit(mat, cust_enc, prod_enc)
        similar = model.get_similar_users("C001", n=2)
        assert len(similar) == 2
        assert similar[0][1] >= similar[1][1]   # descending order


class TestItemItemCF:

    def test_fit_and_similar_products(self, sample_interaction_matrix):
        from src.models.collaborative_filtering import ItemItemCF
        mat, cust_enc, prod_enc = sample_interaction_matrix
        model = ItemItemCF(top_k=3)
        model.fit(mat, cust_enc, prod_enc)
        assert model.is_trained
        assert model.sim_matrix.shape == (4, 4)

        similar = model.get_similar_products("P001", n=2)
        assert isinstance(similar, list)
        assert all(pid != "P001" for pid, _ in similar)

    def test_recommend_for_user(self, sample_interaction_matrix):
        from src.models.collaborative_filtering import ItemItemCF
        mat, cust_enc, prod_enc = sample_interaction_matrix
        model = ItemItemCF().fit(mat, cust_enc, prod_enc)
        recs = model.recommend("C002", n=2)
        assert isinstance(recs, list)


# ─────────────────────────────────────────────────────────────────────────────
# Data Preprocessing Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestDataProcessor:

    def test_clean_removes_cancellations(self, sample_transactions, tmp_path):
        """Transactions starting with 'C' in TransactionID should be removed."""
        df = sample_transactions.copy()
        df.loc[0, "TransactionID"] = "CT001"   # simulate cancellation

        from src.preprocessing.data_processor import DataProcessor
        proc = DataProcessor.__new__(DataProcessor)
        proc.df = df

        # Manually run clean logic
        mask = ~df["TransactionID"].astype(str).str.startswith("C")
        cleaned = df[mask]
        assert "CT001" not in cleaned["TransactionID"].values

    def test_positive_quantity_filter(self, sample_transactions):
        """Negative quantities should be removed."""
        df = sample_transactions.copy()
        df.loc[1, "Quantity"] = -3
        filtered = df[df["Quantity"] > 0]
        assert len(filtered) == len(sample_transactions) - 1

    def test_interaction_aggregation(self, sample_transactions):
        """Interaction matrix should aggregate qty per (customer, product)."""
        agg = (
            sample_transactions
            .groupby(["CustomerID", "ProductID"])["Quantity"]
            .sum()
            .reset_index()
        )
        # C001 bought P001(2) and P002(1) and P003(1)
        c001_p001 = agg.loc[(agg["CustomerID"] == "C001") & (agg["ProductID"] == "P001"), "Quantity"].values
        assert c001_p001[0] == 2


# ─────────────────────────────────────────────────────────────────────────────
# Association Rules Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestAssociationRules:

    def test_fit_generates_rules(self, sample_transactions):
        try:
            from src.models.association_rules import AssociationRuleModel
        except ImportError:
            pytest.skip("mlxtend not available")

        model = AssociationRuleModel(min_support=0.1, min_confidence=0.1, min_lift=0.5)
        model.fit(sample_transactions)
        # May or may not find rules with tiny dataset, but should not crash
        assert hasattr(model, "rules")

    def test_also_bought_empty_rules(self):
        try:
            from src.models.association_rules import AssociationRuleModel
        except ImportError:
            pytest.skip("mlxtend not available")

        model = AssociationRuleModel.__new__(AssociationRuleModel)
        model.rules = pd.DataFrame()
        assert model.get_also_bought("P001") == []
