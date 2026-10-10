"""
src/models/als_model.py
-----------------------
Matrix Factorisation with Alternating Least Squares (ALS) for implicit feedback.

Why ALS for e-commerce?
-----------------------
Purchase data is implicit: a customer didn't explicitly rate a product —
they bought it (or didn't). ALS treats purchase counts as confidence values
and learns latent factor representations for users and items.

Reference: Hu, Koren & Volinsky (2008) "Collaborative Filtering for
           Implicit Feedback Datasets"
"""

import logging
import os
import pickle
from typing import List, Tuple

import numpy as np
from scipy.sparse import csr_matrix

try:
    import implicit
    IMPLICIT_AVAILABLE = True
except ImportError:
    IMPLICIT_AVAILABLE = False
    logging.warning("implicit library not installed. ALS model disabled.")

logger = logging.getLogger(__name__)


class ALSRecommender:
    """
    Wraps the `implicit` library's ALS model with convenient helpers.

    The interaction matrix fed to `implicit` must be item × user (transposed
    from our standard user × item orientation).

    Parameters
    ----------
    factors     : number of latent dimensions
    iterations  : ALS training iterations
    regularization : L2 regularisation weight
    alpha       : confidence scaling factor  (confidence = 1 + alpha * r_ui)
    top_k       : default recommendation count
    """

    def __init__(
        self,
        factors       : int   = 64,
        iterations    : int   = 20,
        regularization: float = 0.01,
        alpha         : float = 40.0,
        top_k         : int   = 10,
    ):
        if not IMPLICIT_AVAILABLE:
            raise ImportError(
                "implicit is required. Install with: pip install implicit"
            )
        self.factors        = factors
        self.iterations     = iterations
        self.regularization = regularization
        self.alpha          = alpha
        self.top_k          = top_k

        self.model            = None
        self.interaction_matrix: csr_matrix = None
        self.customer_enc     = None
        self.product_enc      = None
        self.is_trained       = False

    # ── Training ──────────────────────────────────────────────────────────────
    def fit(
        self,
        interaction_matrix: csr_matrix,
        customer_encoder,
        product_encoder,
    ) -> "ALSRecommender":
        """
        Train the ALS model on the user–item interaction matrix.

        Parameters
        ----------
        interaction_matrix : CSR matrix, shape (n_users × n_products)
        customer_encoder   : fitted LabelEncoder
        product_encoder    : fitted LabelEncoder
        """
        logger.info(
            "Training ALS (factors=%d, iterations=%d, alpha=%.1f) …",
            self.factors, self.iterations, self.alpha,
        )
        self.interaction_matrix = interaction_matrix
        self.customer_enc       = customer_encoder
        self.product_enc        = product_encoder

        # implicit expects item × user (transpose)
        item_user_matrix = (self.alpha * interaction_matrix.T).tocsr()

        self.model = implicit.als.AlternatingLeastSquares(
            factors        = self.factors,
            iterations     = self.iterations,
            regularization = self.regularization,
            random_state   = 42,
        )
        self.model.fit(item_user_matrix)
        self.is_trained = True
        logger.info("ALS training complete.")
        return self

    # ── User recommendations ──────────────────────────────────────────────────
    def recommend(
        self,
        customer_id   : str,
        n             : int  = None,
        filter_already_liked: bool = True,
    ) -> List[Tuple[str, float]]:
        """
        Recommend top-n products for a given customer.

        Returns
        -------
        List of (ProductID, score) tuples.
        """
        n = n or self.top_k
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call fit() first.")

        if customer_id not in self.customer_enc.classes_:
            logger.warning("CustomerID %s not found in training set.", customer_id)
            return []

        user_idx = int(self.customer_enc.transform([customer_id])[0])

        # `implicit` returns (item_ids, scores)
        item_user_matrix = (self.alpha * self.interaction_matrix.T).tocsr()
        ids, scores = self.model.recommend(
            user_idx,
            item_user_matrix[:, user_idx],      # user column from item×user matrix
            N=n,
            filter_already_liked=filter_already_liked,
        )

        product_ids = self.product_enc.inverse_transform(ids)
        return [(pid, float(s)) for pid, s in zip(product_ids, scores)]

    # ── Similar products ──────────────────────────────────────────────────────
    def get_similar_products(
        self, product_id: str, n: int = None
    ) -> List[Tuple[str, float]]:
        """
        Find products most similar to product_id in the latent factor space.
        """
        n = n or self.top_k
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call fit() first.")

        if product_id not in self.product_enc.classes_:
            logger.warning("ProductID %s not found in training set.", product_id)
            return []

        prod_idx = int(self.product_enc.transform([product_id])[0])
        ids, scores = self.model.similar_items(prod_idx, N=n + 1)

        # Remove the item itself
        results = [
            (self.product_enc.inverse_transform([i])[0], float(s))
            for i, s in zip(ids, scores)
            if i != prod_idx
        ]
        return results[:n]

    # ── Similar users ─────────────────────────────────────────────────────────
    def get_similar_users(
        self, customer_id: str, n: int = 5
    ) -> List[Tuple[str, float]]:
        """Find users most similar to customer_id in the latent factor space."""
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call fit() first.")

        if customer_id not in self.customer_enc.classes_:
            return []

        user_idx = int(self.customer_enc.transform([customer_id])[0])
        ids, scores = self.model.similar_users(user_idx, N=n + 1)

        results = [
            (self.customer_enc.inverse_transform([i])[0], float(s))
            for i, s in zip(ids, scores)
            if i != user_idx
        ]
        return results[:n]

    # ── Factors ───────────────────────────────────────────────────────────────
    @property
    def user_factors(self) -> np.ndarray:
        """Return user latent factor matrix (n_users × factors)."""
        return self.model.user_factors

    @property
    def item_factors(self) -> np.ndarray:
        """Return item latent factor matrix (n_items × factors)."""
        return self.model.item_factors

    # ── Persistence ───────────────────────────────────────────────────────────
    def save(self, path: str = "models/saved/als_model.pkl"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self, f)
        logger.info("ALSRecommender saved → %s", path)

    @classmethod
    def load(cls, path: str) -> "ALSRecommender":
        with open(path, "rb") as f:
            obj = pickle.load(f)
        logger.info("ALSRecommender loaded ← %s", path)
        return obj


# ── CLI entry-point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from scipy.sparse import load_npz
    from sklearn.preprocessing import LabelEncoder

    matrix      = load_npz("data/processed/interaction_matrix.npz")
    cust_classes= np.load("data/processed/customer_encoder.npy", allow_pickle=True)
    prod_classes= np.load("data/processed/product_encoder.npy", allow_pickle=True)

    cust_enc = LabelEncoder(); cust_enc.classes_ = cust_classes
    prod_enc = LabelEncoder(); prod_enc.classes_ = prod_classes

    als = ALSRecommender(factors=64, iterations=20, alpha=40.0)
    als.fit(matrix, cust_enc, prod_enc)

    sample_user = cust_classes[0]
    print(f"\n── ALS recs for {sample_user} ─────────────────────────────────────")
    for pid, score in als.recommend(sample_user, n=5):
        print(f"  {pid:>6}  score={score:.4f}")

    sample_prod = prod_classes[0]
    print(f"\n── Similar products to {sample_prod} ──────────────────────────────")
    for pid, score in als.get_similar_products(sample_prod, n=5):
        print(f"  {pid:>6}  score={score:.4f}")

    als.save()
    print("\n✅ ALS model saved.")
