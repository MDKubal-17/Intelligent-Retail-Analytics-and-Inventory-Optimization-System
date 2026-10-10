"""
src/train.py
------------
Master training script.

Runs the full pipeline:
1. Generate synthetic dataset (if not present)
2. Preprocess data
3. Train UserUserCF
4. Train ItemItemCF
5. Train ALS
6. Train Association Rules
7. Evaluate all models
8. Print summary report
"""

import os
import sys
import logging

import numpy as np
import pandas as pd
from scipy.sparse import load_npz
from sklearn.preprocessing import LabelEncoder

# Make project root importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.preprocessing.data_processor import DataProcessor
from src.models.collaborative_filtering import UserUserCF, ItemItemCF
from src.models.als_model import ALSRecommender
from src.models.association_rules import AssociationRuleModel
from src.evaluation.metrics import RecommenderEvaluator, print_evaluation_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_DIR  = "models/saved"
os.makedirs(MODEL_DIR, exist_ok=True)

# ── Step 0: Generate dataset if missing ──────────────────────────────────────
def ensure_data():
    raw_path = "data/raw/ecommerce_data.csv"
    if not os.path.exists(raw_path):
        logger.info("Raw dataset not found. Generating synthetic data …")
        sys.path.insert(0, ".")
        from data.generate_dataset import generate_dataset
        generate_dataset()
    else:
        logger.info("Raw dataset found at %s", raw_path)


# ── Step 1: Preprocess ────────────────────────────────────────────────────────
def preprocess():
    processor = DataProcessor()
    processor.run_pipeline()
    return processor


# ── Step 2: Load artefacts ────────────────────────────────────────────────────
def load_artefacts():
    matrix      = load_npz("data/processed/interaction_matrix.npz")
    cust_classes= np.load("data/processed/customer_encoder.npy", allow_pickle=True)
    prod_classes= np.load("data/processed/product_encoder.npy", allow_pickle=True)

    cust_enc = LabelEncoder(); cust_enc.classes_ = cust_classes
    prod_enc = LabelEncoder(); prod_enc.classes_ = prod_classes
    df       = pd.read_csv("data/processed/clean_transactions.csv")

    return matrix, cust_enc, prod_enc, df


# ── Step 3: Train models ──────────────────────────────────────────────────────
def train_uu_cf(matrix, cust_enc, prod_enc):
    logger.info("═══ Training UserUserCF ═══")
    model = UserUserCF(top_k=10, n_similar=20)
    model.fit(matrix, cust_enc, prod_enc)
    model.save(f"{MODEL_DIR}/uu_cf.pkl")
    return model


def train_ii_cf(matrix, cust_enc, prod_enc):
    logger.info("═══ Training ItemItemCF ═══")
    model = ItemItemCF(top_k=10)
    model.fit(matrix, cust_enc, prod_enc)
    model.save(f"{MODEL_DIR}/ii_cf.pkl")
    return model


def train_als(matrix, cust_enc, prod_enc):
    logger.info("═══ Training ALS ═══")
    model = ALSRecommender(factors=64, iterations=20, alpha=40.0)
    model.fit(matrix, cust_enc, prod_enc)
    model.save(f"{MODEL_DIR}/als_model.pkl")
    return model


def train_rules(df):
    logger.info("═══ Training Association Rules ═══")
    model = AssociationRuleModel(
        min_support=0.01,
        min_confidence=0.10,
        min_lift=1.0,
    )
    model.fit(df)
    model.save(f"{MODEL_DIR}/association_rules.pkl")
    return model


# ── Step 4: Evaluate ─────────────────────────────────────────────────────────
def evaluate_models(uu_cf, ii_cf, als, df):
    logger.info("═══ Evaluating Models ═══")
    evaluator = RecommenderEvaluator(k_values=[5, 10, 20])

    train_df, test_df = evaluator.train_test_split(df, strategy="temporal", test_fraction=0.2)
    logger.info("Train: %d | Test: %d", len(train_df), len(test_df))

    max_users = 200   # sample to keep eval fast

    def _wrap_recs(model, name):
        """Return a recommend_fn with signature (customer_id, n) → List[str]"""
        def fn(cid, n=10):
            recs = model.recommend(cid, n=n)
            return [r[0] if isinstance(r, tuple) else r for r in recs]
        fn.__name__ = name
        return fn

    reports = {}
    for model, name in [(uu_cf, "UserUserCF"), (ii_cf, "ItemItemCF"), (als, "ALS")]:
        if model is None:
            continue
        try:
            summary = evaluator.evaluate_model(
                _wrap_recs(model, name),
                test_df,
                max_users=max_users,
            )
            print_evaluation_report(summary, name)
            reports[name] = summary
        except Exception as e:
            logger.warning("Evaluation failed for %s: %s", name, e)

    return reports


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "═" * 65)
    print("   🛒  E-Commerce Recommendation System — Training Pipeline")
    print("═" * 65)

    ensure_data()
    preprocess()

    matrix, cust_enc, prod_enc, df = load_artefacts()

    uu_cf = train_uu_cf(matrix, cust_enc, prod_enc)
    ii_cf = train_ii_cf(matrix, cust_enc, prod_enc)

    try:
        als = train_als(matrix, cust_enc, prod_enc)
    except Exception as e:
        logger.warning("ALS training skipped: %s", e)
        als = None

    try:
        rules = train_rules(df)
    except Exception as e:
        logger.warning("Association rules skipped: %s", e)
        rules = None

    evaluate_models(uu_cf, ii_cf, als, df)

    print("\n" + "═" * 65)
    print("   ✅  Training complete. Models saved to models/saved/")
    print("═" * 65 + "\n")


if __name__ == "__main__":
    main()
