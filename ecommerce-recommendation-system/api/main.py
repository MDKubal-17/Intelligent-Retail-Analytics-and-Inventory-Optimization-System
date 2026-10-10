"""
api/main.py
-----------
FastAPI REST layer for the E-Commerce Recommendation System.

Endpoints
---------
GET /health                             → service health check
GET /recommend/user/{user_id}           → personalised recs for a user
GET /recommend/product/{product_id}     → similar products ("You may also like")
GET /recommend/also-bought/{product_id} → "Customers also bought"
GET /recommend/basket                   → recommendations for current basket
GET /products                           → list all products
GET /customers                          → list all customer IDs
GET /user/{user_id}/history             → purchase history for a user

Run with:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os
import sys
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Make project root importable when running from project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.recommendation_engine import RecommendationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "E-Commerce Recommendation API",
    description = (
        "Production-ready recommendation engine supporting "
        "User-User CF, Item-Item CF, ALS matrix factorisation, "
        "and Association Rule Mining."
    ),
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# Allow Streamlit & browser frontends to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lazy-load engine ──────────────────────────────────────────────────────────
engine: Optional[RecommendationEngine] = None

def get_engine() -> RecommendationEngine:
    global engine
    if engine is None:
        logger.info("Loading RecommendationEngine …")
        engine = RecommendationEngine().load()
        logger.info("Engine ready.")
    return engine


# ── Pydantic models ───────────────────────────────────────────────────────────
class RecommendationItem(BaseModel):
    rank        : int
    product_id  : str
    product_name: str
    score       : float

class RecommendationResponse(BaseModel):
    user_id     : Optional[str] = None
    product_id  : Optional[str] = None
    method      : str
    count       : int
    recommendations: List[RecommendationItem]

class AlsoBoughtItem(BaseModel):
    rank        : int
    product_id  : str
    product_name: str
    score       : float
    confidence  : Optional[float] = None
    lift        : Optional[float] = None

class AlsoBoughtResponse(BaseModel):
    product_id  : str
    count       : int
    also_bought : List[AlsoBoughtItem]

class BasketRequest(BaseModel):
    product_ids : List[str]
    n           : int = 5

class ProductInfo(BaseModel):
    product_id  : str
    product_name: str

class HistoryItem(BaseModel):
    ProductID   : str
    ProductName : str
    Quantity    : float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    """Service health check."""
    return {"status": "ok", "service": "recommendation-api", "version": "1.0.0"}


@app.get(
    "/recommend/user/{user_id}",
    response_model=RecommendationResponse,
    tags=["Recommendations"],
    summary="Personalised recommendations for a user",
)
def recommend_for_user(
    user_id: str,
    n      : int = Query(default=10, ge=1, le=50, description="Number of recommendations"),
    method : str = Query(default="als", description="als | uu_cf | ii_cf | hybrid"),
):
    """
    Return top-N personalised product recommendations for the given user.
    Tries ALS by default; falls back to CF and popularity if unavailable.
    """
    eng   = get_engine()
    recs  = eng.recommend_for_user(user_id, n=n, method=method)
    if not recs:
        raise HTTPException(
            status_code=404,
            detail=f"No recommendations found for user '{user_id}'. "
                   "The user may not exist in the training data.",
        )
    return RecommendationResponse(
        user_id        = user_id,
        method         = method,
        count          = len(recs),
        recommendations= [RecommendationItem(**r) for r in recs],
    )


@app.get(
    "/recommend/product/{product_id}",
    response_model=RecommendationResponse,
    tags=["Recommendations"],
    summary="Products similar to a given product",
)
def similar_products(
    product_id: str,
    n         : int = Query(default=8, ge=1, le=50),
    method    : str = Query(default="ii_cf", description="ii_cf | als"),
):
    """
    Return products most similar to the given product.
    Powers "You may also like" sections.
    """
    eng  = get_engine()
    recs = eng.similar_products(product_id, n=n, method=method)
    if not recs:
        raise HTTPException(
            status_code=404,
            detail=f"No similar products found for '{product_id}'.",
        )
    return RecommendationResponse(
        product_id     = product_id,
        method         = method,
        count          = len(recs),
        recommendations= [RecommendationItem(**r) for r in recs],
    )


@app.get(
    "/recommend/also-bought/{product_id}",
    response_model=AlsoBoughtResponse,
    tags=["Recommendations"],
    summary="Customers also bought",
)
def also_bought(
    product_id: str,
    n         : int = Query(default=5, ge=1, le=20),
):
    """
    Return products frequently purchased together with the given product.
    Uses Association Rules (confidence + lift) with CF fallback.
    """
    eng  = get_engine()
    recs = eng.customers_also_bought(product_id, n=n)
    return AlsoBoughtResponse(
        product_id = product_id,
        count      = len(recs),
        also_bought= [AlsoBoughtItem(**r) for r in recs],
    )


@app.post(
    "/recommend/basket",
    response_model=AlsoBoughtResponse,
    tags=["Recommendations"],
    summary="Recommendations for a basket of products",
)
def basket_recommendations(body: BasketRequest):
    """
    Given the current cart contents, recommend items to add.
    Uses Association Rules (antecedent = basket items).
    """
    eng  = get_engine()
    recs = eng.basket_recommendations(body.product_ids, n=body.n)
    return AlsoBoughtResponse(
        product_id = "basket",
        count      = len(recs),
        also_bought= [AlsoBoughtItem(**r) for r in recs],
    )


@app.get(
    "/user/{user_id}/history",
    response_model=List[HistoryItem],
    tags=["Users"],
    summary="Purchase history for a user",
)
def user_history(user_id: str):
    """Return a user's full purchase history sorted by quantity."""
    eng   = get_engine()
    hist  = eng.get_user_history(user_id)
    if not hist:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return hist


@app.get(
    "/products",
    response_model=List[ProductInfo],
    tags=["Catalogue"],
    summary="List all products",
)
def list_products():
    """Return all products in the catalogue."""
    eng = get_engine()
    return eng.all_products()


@app.get(
    "/customers",
    response_model=List[str],
    tags=["Catalogue"],
    summary="List all customer IDs",
)
def list_customers(limit: int = Query(default=100, le=5000)):
    """Return up to `limit` customer IDs."""
    eng = get_engine()
    return eng.all_customers()[:limit]


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
