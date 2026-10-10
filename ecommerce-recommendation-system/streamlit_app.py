""" 
app/streamlit_app.py
---------------------
Streamlit UI for the E-Commerce Recommendation System.

Features
--------
• Product page with "You may also like" recommendations
• "Customers also bought" section powered by association rules
• Personalised user recommendations
• User purchase history view
• Model evaluation dashboard

Run with:
    streamlit run app/streamlit_app.py
"""

import os
import sys
import requests

import pandas as pd
import streamlit as st

# ── Project path ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ── Config ────────────────────────────────────────────────────────────────────
API_BASE = os.environ.get("API_BASE", "http://localhost:8000")

st.set_page_config(
    page_title="🛒 ShopAI — Recommendation System",
    page_icon="🛒",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .product-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        color: white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .rec-card {
        background: #f8f9ff;
        border: 1px solid #e0e4ff;
        border-radius: 10px;
        padding: 14px;
        margin: 6px 0;
        transition: all 0.2s;
    }
    .rec-card:hover { border-color: #667eea; box-shadow: 0 2px 12px rgba(102,126,234,0.15); }
    .score-badge {
        background: #667eea;
        color: white;
        border-radius: 20px;
        padding: 2px 10px;
        font-size: 12px;
        font-weight: 600;
    }
    .lift-badge {
        background: #28a745;
        color: white;
        border-radius: 20px;
        padding: 2px 10px;
        font-size: 12px;
    }
    .section-header {
        font-size: 1.3rem;
        font-weight: 700;
        color: #2d3748;
        margin: 20px 0 12px 0;
        padding-bottom: 6px;
        border-bottom: 2px solid #667eea;
    }
    .metric-box {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
    }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] { border-radius: 8px 8px 0 0; }
</style>
""", unsafe_allow_html=True)


# ── API helpers ───────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def api_get(endpoint: str) -> dict:
    try:
        r = requests.get(f"{API_BASE}{endpoint}", timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e)}

@st.cache_data(ttl=300)
def get_products() -> list:
    data = api_get("/products")
    return data if isinstance(data, list) else []

@st.cache_data(ttl=300)
def get_customers() -> list:
    data = api_get("/customers?limit=500")
    return data if isinstance(data, list) else []


# ── Render helpers ────────────────────────────────────────────────────────────
def render_recommendation_cards(recs: list, show_lift: bool = False):
    if not recs:
        st.info("No recommendations available.")
        return
    for rec in recs:
        pid   = rec.get("product_id", rec.get("ProductID", ""))
        pname = rec.get("product_name", rec.get("ProductName", pid))
        score = rec.get("score", 0)
        rank  = rec.get("rank", "")

        lift_html = ""
        if show_lift and rec.get("lift"):
            lift_html = f'<span class="lift-badge">Lift {rec["lift"]:.2f}</span>'
        conf_html = ""
        if show_lift and rec.get("confidence"):
            conf_html = f'<span class="score-badge">Conf {rec["confidence"]:.0%}</span>'

        st.markdown(f"""
        <div class="rec-card">
            <b>#{rank} &nbsp; {pname}</b><br>
            <small style="color:#718096">{pid}</small>
            <span style="float:right">
                {conf_html} {lift_html}
                <span class="score-badge">Score {score:.4f}</span>
            </span>
        </div>
        """, unsafe_allow_html=True)


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://placehold.co/300x80/667eea/white?text=ShopAI", use_column_width=True)
    st.markdown("---")
    page = st.radio(
        "Navigation",
        ["🏠 Home", "👤 For You", "🛍️ Product Page", "📊 Model Insights", "ℹ️ About"],
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.caption("Powered by ALS · CF · Apriori")


# ═══════════════════════════════════════════════════════════════════════════════
# Page: Home
# ═══════════════════════════════════════════════════════════════════════════════
if "Home" in page:
    st.title("🛒 ShopAI — E-Commerce Recommendation System")
    st.markdown("""
    > *A production-grade recommendation engine demonstrating User-User CF,
    > Item-Item CF, ALS Matrix Factorisation, and Association Rule Mining.*
    """)

    c1, c2, c3, c4 = st.columns(4)
    products  = get_products()
    customers = get_customers()

    with c1:
        st.metric("📦 Products", f"{len(products):,}")
    with c2:
        st.metric("👥 Customers", f"{len(customers):,}")
    with c3:
        st.metric("🧠 Models", "4")
    with c4:
        health = api_get("/health")
        status = "🟢 Online" if "ok" in str(health.get("status", "")) else "🔴 Offline"
        st.metric("API Status", status)

    st.markdown("---")
    st.subheader("Architecture")
    st.markdown("""
    ```
    User Request
        │
        ▼
    ┌─────────────────────────────────────┐
    │       Recommendation Engine         │
    │  ┌──────────┐  ┌──────────────────┐ │
    │  │ UserCF   │  │  ItemItemCF      │ │
    │  │ (cosine) │  │  (co-purchase)   │ │
    │  └──────────┘  └──────────────────┘ │
    │  ┌──────────┐  ┌──────────────────┐ │
    │  │ ALS (MF) │  │  Apriori Rules   │ │
    │  │ implicit │  │  (confidence)    │ │
    │  └──────────┘  └──────────────────┘ │
    └─────────────────────────────────────┘
        │
        ▼
    FastAPI REST Layer  →  Streamlit UI
    ```
    """)

    st.subheader("Quick Demo")
    demo_cols = st.columns([2, 2, 1])
    with demo_cols[0]:
        if products:
            demo_prod = st.selectbox("Pick a product", [p["product_id"] for p in products],
                                     format_func=lambda x: next((p["product_name"] for p in products if p["product_id"] == x), x))
    with demo_cols[1]:
        if customers:
            demo_user = st.selectbox("Pick a customer", customers[:50])
    with demo_cols[2]:
        st.write("")
        st.write("")
        go = st.button("▶ Show Recs", type="primary")

    if go:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown('<div class="section-header">👤 Personalised Recs</div>', unsafe_allow_html=True)
            data = api_get(f"/recommend/user/{demo_user}?n=5")
            render_recommendation_cards(data.get("recommendations", []))
        with col2:
            st.markdown('<div class="section-header">🛍️ Similar Products</div>', unsafe_allow_html=True)
            data = api_get(f"/recommend/product/{demo_prod}?n=5")
            render_recommendation_cards(data.get("recommendations", []))


# ═══════════════════════════════════════════════════════════════════════════════
# Page: For You (personalised)
# ═══════════════════════════════════════════════════════════════════════════════
elif "For You" in page:
    st.title("👤 Personalised Recommendations")

    customers = get_customers()
    if not customers:
        st.error("Could not load customers. Is the API running?")
        st.stop()

    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        user_id = st.selectbox("Select Customer", customers[:200])
    with col2:
        n_recs  = st.slider("# of recommendations", 5, 20, 10)
    with col3:
        method  = st.selectbox("Algorithm", ["als", "uu_cf", "ii_cf", "hybrid"])

    if st.button("🔍 Get Recommendations", type="primary"):
        tab1, tab2 = st.tabs(["✨ Recommendations", "📋 Purchase History"])

        with tab1:
            with st.spinner("Generating personalised recommendations …"):
                data = api_get(f"/recommend/user/{user_id}?n={n_recs}&method={method}")
            if "error" in data:
                st.error(f"API Error: {data['error']}")
            elif "recommendations" in data:
                st.markdown(f'<div class="section-header">Top {n_recs} Recommendations for {user_id}</div>',
                            unsafe_allow_html=True)
                render_recommendation_cards(data["recommendations"])
            else:
                st.warning(str(data))

        with tab2:
            hist = api_get(f"/user/{user_id}/history")
            if isinstance(hist, list) and hist:
                df_hist = pd.DataFrame(hist)
                st.dataframe(df_hist, use_container_width=True)
            else:
                st.info("No purchase history found for this user.")


# ═══════════════════════════════════════════════════════════════════════════════
# Page: Product Page
# ═══════════════════════════════════════════════════════════════════════════════
elif "Product Page" in page:
    st.title("🛍️ Product Page")

    products = get_products()
    if not products:
        st.error("Could not load products. Is the API running?")
        st.stop()

    pid  = st.selectbox(
        "Select Product",
        [p["product_id"] for p in products],
        format_func=lambda x: next((p["product_name"] for p in products if p["product_id"] == x), x),
    )
    selected = next((p for p in products if p["product_id"] == pid), {})

    # ── Product hero card
    st.markdown(f"""
    <div class="product-card">
        <h2 style="margin:0">📦 {selected.get("product_name", pid)}</h2>
        <p style="margin:4px 0;opacity:0.85">SKU: {pid}</p>
        <p style="margin:4px 0;font-size:1.8rem;font-weight:700">★★★★☆  4.2 / 5.0</p>
    </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown('<div class="section-header">✨ You May Also Like</div>', unsafe_allow_html=True)
        with st.spinner("Finding similar products …"):
            similar = api_get(f"/recommend/product/{pid}?n=6")
        render_recommendation_cards(similar.get("recommendations", []))

    with col2:
        st.markdown('<div class="section-header">🤝 Customers Also Bought</div>', unsafe_allow_html=True)
        with st.spinner("Loading association rules …"):
            also = api_get(f"/recommend/also-bought/{pid}?n=5")
        render_recommendation_cards(also.get("also_bought", []), show_lift=True)

    # ── Basket widget
    st.markdown('<div class="section-header">🛒 Add to Basket & Get Suggestions</div>',
                unsafe_allow_html=True)
    basket_items = st.multiselect(
        "Current basket",
        [p["product_id"] for p in products],
        default=[pid],
        format_func=lambda x: next((p["product_name"] for p in products if p["product_id"] == x), x),
    )
    if st.button("💡 Suggest basket additions"):
        try:
            r = requests.post(
                f"{API_BASE}/recommend/basket",
                json={"product_ids": basket_items, "n": 5},
                timeout=5,
            )
            basket_recs = r.json().get("also_bought", [])
            render_recommendation_cards(basket_recs, show_lift=True)
        except Exception as e:
            st.error(str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# Page: Model Insights
# ═══════════════════════════════════════════════════════════════════════════════
elif "Model Insights" in page:
    st.title("📊 Model Performance & Insights")
    st.info(
        "Evaluation metrics are computed offline during training. "
        "This page provides an illustrative benchmark table."
    )

    bench = pd.DataFrame({
        "Model"        : ["UserUser CF", "ItemItem CF", "ALS (MF)", "Hybrid"],
        "Precision@10" : [0.142, 0.158, 0.181, 0.195],
        "Recall@10"    : [0.089, 0.101, 0.122, 0.134],
        "NDCG@10"      : [0.201, 0.218, 0.247, 0.263],
        "Hit Rate@10"  : [0.412, 0.438, 0.491, 0.513],
        "MRR"          : [0.167, 0.183, 0.211, 0.229],
    })

    st.dataframe(
        bench.style.highlight_max(axis=0, color="#d4edda", subset=bench.columns[1:]),
        use_container_width=True,
    )

    import json
    metrics_json = bench.to_json(orient="records")

    st.subheader("Metric Explanations")
    with st.expander("📖 What do these metrics mean?"):
        st.markdown("""
| Metric | Formula | Interpretation |
|--------|---------|---------------|
| **Precision@K** | Relevant in top-K / K | Of K shown, what fraction is useful? |
| **Recall@K** | Relevant in top-K / Total relevant | How much of what the user wants do we surface? |
| **NDCG@K** | Σ rel/log₂(rank+1) / IDCG | Rewards correct items ranked higher |
| **Hit Rate@K** | Users with ≥1 hit / Total users | What fraction of users get at least 1 useful rec? |
| **MRR** | 1 / rank of first relevant item | How quickly does a relevant item appear? |
        """)

    st.subheader("Algorithm Comparison")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("""
**User-User CF**
- Finds customers with similar purchase history
- Slow at scale (O(n²) similarity)
- Good for cold-start items

**Item-Item CF**
- Finds products frequently bought together
- Pre-computable; fast at inference
- Better for dense catalogues
        """)
    with col2:
        st.markdown("""
**ALS Matrix Factorisation**
- Learns latent factors for users & items
- Handles implicit feedback natively
- Best accuracy; GPU-scalable

**Association Rules (Apriori)**
- Interpretable: "If A then B (conf=80%)"
- Ideal for basket completion
- Computationally limited to small itemsets
        """)


# ═══════════════════════════════════════════════════════════════════════════════
# Page: About
# ═══════════════════════════════════════════════════════════════════════════════
elif "About" in page:
    st.title("ℹ️ About This Project")
    st.markdown("""
## E-Commerce Recommendation System

**Tech Stack**
- **Data Processing** — pandas, NumPy, scikit-learn
- **Collaborative Filtering** — scikit-learn cosine similarity
- **Matrix Factorisation** — implicit ALS
- **Association Rules** — mlxtend Apriori
- **API** — FastAPI + Uvicorn
- **UI** — Streamlit
- **Persistence** — pickle, scipy sparse NPZ

**Dataset**
Synthetic e-commerce transaction data (1,000 customers, 30 products,
~25,000 line items) modelled after the UCI Online Retail dataset.

**Project Structure**
```
ecommerce-recommendation-system/
├── data/                    ← raw + processed datasets
│   ├── raw/
│   └── processed/
├── src/                     ← all Python source
│   ├── preprocessing/       ← data_processor.py
│   ├── models/              ← CF, ALS, association rules
│   ├── evaluation/          ← metrics.py
│   ├── recommendation_engine.py
│   └── train.py
├── api/                     ← FastAPI app
│   └── main.py
├── app/                     ← Streamlit frontend
│   └── streamlit_app.py
├── models/saved/            ← serialised model files
├── notebooks/               ← EDA + experiments
├── requirements.txt
└── README.md
```

**Author** — Built as a portfolio demonstration of production ML systems.
    """)
