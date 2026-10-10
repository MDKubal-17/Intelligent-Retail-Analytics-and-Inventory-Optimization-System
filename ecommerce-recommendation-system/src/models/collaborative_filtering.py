"""
src/models/collaborative_filtering.py
--------------------------------------
User-User and Item-Item Collaborative Filtering using cosine similarity.

Both classes share a common BaseCollaborativeFilter interface so they can
be swapped interchangeably in the recommendation engine.
"""

import logging
import os
import pickle
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

logger = logging.getLogger(__name__)


# ── Base class ────────────────────────────────────────────────────────────────
class BaseCollaborativeFilter:
    """Shared interface for CF models."""

    def __init__(self, top_k: int = 10):
        self.top_k       = top_k
        self.is_trained  = False
        self.sim_matrix  = None          # numpy array
        self.customer_enc = None
        self.product_enc  = None
        self.interaction_matrix: csr_matrix = None

    def fit(self, *args, **kwargs):
        raise NotImplementedError

    def recommend(self, *args, **kwargs):
        raise NotImplementedError

    def save(self, path: str):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self, f)
        logger.info("Model saved → %s", path)

    @classmethod
    def load(cls, path: str) -> "BaseCollaborativeFilter":
        with open(path, "rb") as f:
            obj = pickle.load(f)
        logger.info("Model loaded ← %s", path)
        return obj


# ─────────────────────────────────────────────────────────────────────────────
# A.  User-User Collaborative Filtering
# ─────────────────────────────────────────────────────────────────────────────
class UserUserCF(BaseCollaborativeFilter):
    """
    Recommends products to a target user by:
    1. Finding the K most similar users (cosine similarity on interaction row).
    2. Aggregating their interaction scores, weighted by similarity.
    3. Excluding products the target user already bought.

    Parameters
    ----------
    top_k        : number of recommendations to return
    n_similar    : number of similar users to consider
    """

    def __init__(self, top_k: int = 10, n_similar: int = 20):
        super().__init__(top_k)
        self.n_similar = n_similar

    def fit(
        self,
        interaction_matrix: csr_matrix,
        customer_encoder,
        product_encoder,
    ) -> "UserUserCF":
        """
        Compute user–user cosine similarity matrix.

        Parameters
        ----------
        interaction_matrix : CSR matrix (n_users × n_products)
        customer_encoder   : fitted LabelEncoder for CustomerID
        product_encoder    : fitted LabelEncoder for ProductID
        """
        logger.info("Training UserUserCF …")
        self.interaction_matrix = interaction_matrix
        self.customer_enc       = customer_encoder
        self.product_enc        = product_encoder

        # Dense similarity is fine for up to ~5 k users; use batched for larger
        logger.info("Computing user–user cosine similarity …")
        self.sim_matrix = cosine_similarity(interaction_matrix)
        np.fill_diagonal(self.sim_matrix, 0)   # exclude self-similarity

        self.is_trained = True
        logger.info("UserUserCF trained. Similarity matrix: %s", self.sim_matrix.shape)
        return self

    def recommend(
        self,
        customer_id: str,
        n: int = None,
        exclude_purchased: bool = True,
    ) -> List[Tuple[str, float]]:
        """
        Return top-n product recommendations for a customer.

        Returns
        -------
        List of (ProductID, score) tuples sorted by descending score.
        """
        n = n or self.top_k

        if customer_id not in self.customer_enc.classes_:
            logger.warning("CustomerID %s not in training set.", customer_id)
            return []

        user_idx = self.customer_enc.transform([customer_id])[0]
        user_vec  = self.interaction_matrix[user_idx].toarray().flatten()

        # Find top N similar users
        sim_scores  = self.sim_matrix[user_idx]
        similar_idx = np.argsort(-sim_scores)[: self.n_similar]
        similar_sim = sim_scores[similar_idx]

        # Weighted sum of their purchase vectors
        similar_vecs = self.interaction_matrix[similar_idx].toarray()   # (n_similar, n_products)
        weighted_sum = (similar_sim[:, np.newaxis] * similar_vecs).sum(axis=0)

        # Exclude already-bought products
        if exclude_purchased:
            weighted_sum[user_vec > 0] = 0

        # Rank
        top_idx   = np.argsort(-weighted_sum)[:n]
        top_scores= weighted_sum[top_idx]
        top_prods = self.product_enc.inverse_transform(top_idx)

        return [(pid, float(score)) for pid, score in zip(top_prods, top_scores) if score > 0]

    def get_similar_users(self, customer_id: str, n: int = 5) -> List[Tuple[str, float]]:
        """Return the top-n most similar customers."""
        if customer_id not in self.customer_enc.classes_:
            return []
        user_idx   = self.customer_enc.transform([customer_id])[0]
        sim_scores = self.sim_matrix[user_idx]
        top_idx    = np.argsort(-sim_scores)[:n]
        top_ids    = self.customer_enc.inverse_transform(top_idx)
        return list(zip(top_ids, sim_scores[top_idx].tolist()))


# ─────────────────────────────────────────────────────────────────────────────
# B.  Item-Item Collaborative Filtering
# ─────────────────────────────────────────────────────────────────────────────
class ItemItemCF(BaseCollaborativeFilter):
    """
    Recommends products similar to products a user has already purchased, or
    returns products most similar to a given product.

    Co-purchase patterns are captured via transposed interaction matrix.

    Parameters
    ----------
    top_k     : default number of recommendations to return
    """

    def fit(
        self,
        interaction_matrix: csr_matrix,
        customer_encoder,
        product_encoder,
    ) -> "ItemItemCF":
        """
        Compute item–item cosine similarity matrix.
        """
        logger.info("Training ItemItemCF …")
        self.interaction_matrix = interaction_matrix
        self.customer_enc       = customer_encoder
        self.product_enc        = product_encoder

        # Transpose: rows = products, cols = users
        item_matrix = interaction_matrix.T
        logger.info("Computing item–item cosine similarity …")
        self.sim_matrix = cosine_similarity(item_matrix)
        np.fill_diagonal(self.sim_matrix, 0)

        self.is_trained = True
        logger.info("ItemItemCF trained. Similarity matrix: %s", self.sim_matrix.shape)
        return self

    def recommend(
        self,
        customer_id: str,
        n: int = None,
        exclude_purchased: bool = True,
    ) -> List[Tuple[str, float]]:
        """
        Recommend products to a user based on their purchase history.
        Aggregates similar-item scores for all items the user has bought.
        """
        n = n or self.top_k

        if customer_id not in self.customer_enc.classes_:
            logger.warning("CustomerID %s not in training set.", customer_id)
            return []

        user_idx  = self.customer_enc.transform([customer_id])[0]
        user_vec  = self.interaction_matrix[user_idx].toarray().flatten()
        bought_idx= np.where(user_vec > 0)[0]

        if len(bought_idx) == 0:
            return []

        # Sum similarity scores from each purchased item
        score_vec = np.zeros(self.sim_matrix.shape[0])
        for idx in bought_idx:
            score_vec += user_vec[idx] * self.sim_matrix[idx]

        if exclude_purchased:
            score_vec[bought_idx] = 0

        top_idx    = np.argsort(-score_vec)[:n]
        top_scores = score_vec[top_idx]
        top_prods  = self.product_enc.inverse_transform(top_idx)

        return [(pid, float(score)) for pid, score in zip(top_prods, top_scores) if score > 0]

    def get_similar_products(
        self, product_id: str, n: int = None
    ) -> List[Tuple[str, float]]:
        """
        Return top-n most similar products to a given product.
        This powers the "Customers also bought" section.
        """
        n = n or self.top_k

        if product_id not in self.product_enc.classes_:
            logger.warning("ProductID %s not in training set.", product_id)
            return []

        prod_idx  = self.product_enc.transform([product_id])[0]
        sim_scores= self.sim_matrix[prod_idx]
        top_idx   = np.argsort(-sim_scores)[:n]
        top_ids   = self.product_enc.inverse_transform(top_idx)

        return list(zip(top_ids, sim_scores[top_idx].tolist()))
