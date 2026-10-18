# 🛍️ Intelligent Retail Analytics and Inventory Optimization System

**An AI-powered retail management platform for demand forecasting, inventory optimization, product recommendations, and data-driven business decisions.**

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Machine Learning](https://img.shields.io/badge/Machine%20Learning-AI-purple?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## 📌 Overview

The **Intelligent Retail Analytics and Inventory Optimization System** is a web-based application designed to help retail businesses manage inventory, analyze sales performance, forecast future demand, and make informed purchasing decisions.

Traditional inventory management often relies on manual calculations and historical observations, which can lead to overstocking, stock shortages, and inefficient purchasing decisions.

This project addresses these challenges by integrating machine learning, time-series forecasting, product recommendation algorithms, inventory monitoring, and purchase-order management into a unified platform.

The system combines historical sales data with intelligent analytical techniques to generate demand forecasts, identify products requiring restocking, recommend relevant products, and support inventory-related decisions.

## 🎯 Objectives

- Automate inventory monitoring and reduce manual effort.
- Analyze historical sales data to identify business trends.
- Forecast future product demand using a pretrained time-series forecasting model.
- Identify products that require replenishment based on stock levels and reorder thresholds.
- Generate intelligent product recommendations using collaborative filtering and association-rule mining.
- Simplify purchase-order creation and supplier quotation requests.
- Provide transaction records and verification features for improved operational traceability.
- Present retail data through a centralized, interactive dashboard.

## ✨ Key Features

### 1. 📊 Interactive Dashboard
- Displays important inventory and sales information in one place.
- Provides an overview of product stock levels and inventory risks.
- Highlights low-stock products and important inventory alerts.
- Helps users understand the current state of retail operations.

### 2. 📈 Sales Analytics
- Maintains sales records containing product, quantity, price, discount, and revenue information.
- Supports analysis of product-wise sales performance.
- Helps identify sales patterns and understand product demand.
- Calculates revenue after applicable discounts.

### 3. 🤖 AI-Based Demand Forecasting
- Integrates **Chronos-2**, a pretrained time-series forecasting model from Amazon.
- Uses historical daily sales observations to forecast future demand.
- Supports product-level forecasting for inventory planning.
- Helps businesses anticipate potential demand fluctuations.

### 4. 📦 Intelligent Inventory Management
- Monitors current stock against predefined reorder levels.
- Identifies products that may require replenishment.
- Categorizes inventory risk to support prioritization.
- Helps reduce the likelihood of stockouts and unnecessary overstocking.

### 5. 🛒 Product Recommendation Engine
Integrates an existing recommendation-engine implementation to generate relevant product suggestions using multiple algorithms.

Supported approaches include:

- **User-User Collaborative Filtering:** Identifies users with similar purchasing behavior and recommends products based on their preferences.
- **Item-Item Collaborative Filtering:** Identifies relationships between products based on user interactions or purchasing patterns.
- **Alternating Least Squares (ALS):** Learns latent user and item representations to estimate recommendation relevance.
- **Apriori Algorithm:** Discovers frequent itemsets and association rules to identify products that are often purchased together.

The recommendation engine supports different methods through its API, allowing product suggestions to be generated using the selected algorithm.

### 6. 🧾 Smart Purchase Order Generator
- Supports purchase-order creation for inventory replenishment.
- Stores purchase-order records using CSV-based storage.
- Allows supplier details to be entered manually.
- Supports requesting supplier quotations through email.
- Updates inventory stock when goods are received, helping maintain consistency between purchasing and inventory operations.

### 7. 🔍 Transaction Management and Verification
- Maintains transaction-related records.
- Supports transaction review and verification workflows.
- Helps users trace sales and inventory-related activities.

### 8. 📑 Reports and Compliance
- Provides sales-performance and government-audit report interfaces.
- Retrieves report information through backend APIs.
- Supports PDF generation for sales-performance reporting.
- Presents inventory and operational indicators for review.

### 9. 🔐 Authentication
- Provides user registration and login functionality.
- Uses password hashing with bcrypt in the authentication backend.
- Supports controlled access to the application's user interface.

## 🧠 AI and Machine Learning Techniques

| Technique | Purpose |
|---|---|
| Chronos-2 | Time-series demand forecasting |
| Random Forest | Machine-learning-based prediction |
| User-User Collaborative Filtering | User similarity-based recommendations |
| Item-Item Collaborative Filtering | Product similarity-based recommendations |
| Alternating Least Squares (ALS) | Latent-factor recommendations |
| Apriori | Frequent itemsets and association rules |

### Chronos-2 Forecasting

Chronos-2 is a pretrained time-series foundation model that can generate forecasts from historical observations. In this project, it is used to forecast future sales demand from daily product sales data.

The forecasting workflow consists of:

1. Collecting historical sales records.
2. Preparing the observations in chronological order.
3. Providing the time series to the forecasting model.
4. Generating future demand estimates.
5. Using the predictions to support inventory and purchasing decisions.

### Random Forest

Random Forest is an ensemble machine-learning algorithm that combines predictions from multiple decision trees. Depending on the prediction task, it can be used for classification or regression.

Within the project, the trained model is loaded from a serialized model file and used through the prediction backend. The model's exact input features and target should be documented alongside the training implementation.

## 🏗️ System Architecture

The application follows a modular architecture that separates the user interface, backend services, data storage, and analytical components.

```text
                  USER
                    |
                    v
          React + Vite Frontend
                    |
          REST API / HTTP Requests
                    |
          +---------+----------+
          |                    |
          v                    v
    Flask Backend        Node.js / Express
          |               Reporting and
          |               Authentication
          |
    +-----+----------------------+
    |              |             |
    v              v             v
  CSV Data      ML Models    Forecasting
    |              |          Chronos-2
    |              |             |
    +--------------+-------------+
                   |
                   v
        Inventory and Sales Insights

          Recommendation Service
                   |
                   v
       Collaborative Filtering
             and Apriori
```

*Note: The reporting, authentication, and recommendation components are separate services or modules. Their actual integration depends on the configured API URLs and running backend processes.*

## 🛠️ Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- HTML5 and CSS3
- Recharts for supported dashboard visualizations

### Backend
- Python
- Flask
- REST APIs
- Node.js and Express.js
- FastAPI for the recommendation service

### Artificial Intelligence and Machine Learning
- Chronos-2
- Random Forest
- Collaborative Filtering
- Alternating Least Squares
- Apriori association-rule mining
- scikit-learn and related Python libraries

### Data Storage
- CSV-based sales and inventory datasets
- CSV-based inventory transaction and purchase-order records
- MongoDB for applicable authentication and reporting data

### Development Tools
- Git and GitHub
- Visual Studio Code
- Postman or a similar API testing tool

## 📁 Project Structure

The project consists of a frontend application and multiple backend modules. The following is a logical overview; adjust the directory names to match the current repository.

```text
Intelligent-Retail-Analytics-and-Inventory-Optimization-System/
│
├── RETAIL-ANALYTICS-FRONTEND/
│   └── src/
│       ├── components/
│       │   ├── AIRecommendations
│       │   ├── InventoryChart
│       │   └── LowStockAlerts
│       │
│       └── pages/
│           ├── Dashboard
│           ├── Forecast
│           ├── Inventory
│           ├── Products
│           ├── Reports
│           ├── Sales
│           ├── Settings
│           └── Transactions
│
├── Flask Backend/
│   ├── app.py
│   ├── data/
│   ├── routes/
│   ├── training/
│   ├── rf_model.pkl
│   ├── le_product.pkl
│   ├── le_category.pkl
│   └── requirements.txt
│
├── Recommendation Service/
│   ├── api/
│   └── src/
│
├── Node.js Services/
│   ├── Authentication
│   └── Reports
│
├── inventory_data.csv
├── sales_data.csv
├── inventory_transactions.csv
├── complete_daily_sales.csv
│
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the application:

- Python 3.10 or a compatible version supported by the project's dependencies.
- Node.js and npm.
- Git.
- MongoDB
- Sufficient storage and memory for the forecasting model.

### Step 1: Clone the Repository

```bash
git clone https://github.com/MDKubal-17/Intelligent-Retail-Analytics-and-Inventory-Optimization-System.git

cd Intelligent-Retail-Analytics-and-Inventory-Optimization-System
```

### Step 2: Set Up the Flask Backend

Navigate to the directory containing `app.py` and the Python dependency file.

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

If the requirements file does not exist, create one containing the dependencies used by the actual backend.

Start the Flask application:

```bash
python app.py
```

The backend may be available at:

```text
http://127.0.0.1:5000
```

Confirm the port and host in your Flask configuration.

### Step 3: Set Up the React Frontend

Open another terminal:

```bash
cd RETAIL-ANALYTICS-FRONTEND
npm install
```

Create or update the frontend environment configuration with the appropriate backend URLs if required by the application.

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite, typically:

```text
http://localhost:5173
```

### Step 4: Configure Additional Services

Start the Node.js authentication and reporting services from their respective directories using the commands defined in their `package.json` files.

If the recommendation engine is deployed as a separate FastAPI application, install its dependencies and launch it using its configured entry point.

Ensure that:

- Frontend API URLs point to the correct backend services.
- MongoDB connection settings are configured where required.
- CSV datasets are available at the paths expected by the application.
- Required model files are present.
- Email credentials are configured securely if supplier quotation emails are enabled.

**Important:** The exact start commands and environment variable names should match each service's existing configuration.

## 🔌 Important API Endpoints

The following endpoints represent the project's known API routes. Availability depends on which backend service is running.

| Endpoint | Purpose |
|---|---|
| `/api/data/inventory` | Retrieve inventory data |
| `/api/products` | Retrieve product information |
| `/api/sales` | Retrieve sales records |
| `/api/transactions` | Retrieve transaction records |
| `/api/inventory/action` | Perform an inventory-related action |
| `/api/forecast` | Generate or retrieve demand forecasts |
| `/predict` | Run the configured machine-learning prediction |
| `/api/purchase-orders` | Manage purchase orders |
| `/api/reports/government-audit` | Retrieve government-audit report data |
| `/api/reports/sales-performance.pdf` | Generate or retrieve the sales-performance PDF |

Authentication routes are handled by the applicable authentication service. Recommendation endpoints are handled by the recommendation API.

## 📊 Dataset Description

The application uses structured sales and inventory data to perform its analysis.

### Inventory Dataset

Typical fields include:

- `product_id` — Unique product identifier.
- `product` — Product name.
- `category` — Product category.
- `current_stock` — Quantity currently available.
- `reorder_level` — Stock threshold for replenishment.
- `unit_price` — Price per unit.
- `inventory_value` — Recorded inventory value.
- `status` — Current stock status.
- `img_url` — Product image reference.

### Sales Dataset

Typical fields include:

- `date` — Transaction or sales date.
- `product_id` — Identifier of the sold product.
- `product` — Product name.
- `category` — Product category.
- `quantity` — Quantity sold.
- `unit_price` — Unit selling price.
- `discount_percent` — Applied discount percentage.
- `revenue` — Revenue recorded after applicable discounts.
- `transaction_id` — Transaction identifier.

The application also uses transaction and daily-sales datasets for inventory tracking and forecasting. The precise schema should be verified against the latest CSV files.

## 📏 Model Evaluation

The forecasting workflow has been evaluated using historical daily sales data.

| Evaluation detail | Recorded value |
|---|---|
| Forecasting model | Chronos-2 |
| Historical date range | January 1 – June 30, 2026 |
| Number of sales records | 1,810 |
| Number of products | 10 |
| Forecast horizon | 7 days |
| Mean Absolute Error (MAE) | 1.07 |
| Root Mean Squared Error (RMSE) | 3.72 |

These are the recorded results from the project's current forecasting evaluation. They should not be interpreted as guaranteed performance on unseen products, future periods, or other retail datasets.

**MAE** measures the average absolute difference between actual and predicted values. **RMSE** gives greater weight to larger prediction errors.

For a complete evaluation, forecasts should be compared against actual sales using a held-out test period and a clearly documented evaluation procedure.

## 💡 What Makes This Project Different?

The key contribution is the integration of multiple retail decision-support capabilities into one application rather than treating sales analytics, forecasting, recommendations, and inventory management as isolated tasks.

The system connects historical sales observations with demand forecasting, stock monitoring, product recommendations, and purchase-order workflows. This allows analytical outputs to support operational actions.

Its practical value lies in bringing together:

- Predictive insights for demand planning.
- Rule-based stock monitoring.
- Multiple recommendation approaches.
- Purchasing and supplier communication workflows.
- Centralized sales and inventory reporting.

The system is intended as a decision-support tool. Its recommendations and forecasts assist users but do not guarantee optimal purchasing decisions or eliminate the need for business judgment.

## 🔮 Future Enhancements

- Integrate live point-of-sale data.
- Improve forecasting evaluation across multiple products and seasonal periods.
- Add automated supplier selection and purchase-order suggestions.
- Introduce role-based access control.
- Add notifications for critical stock shortages.
- Evaluate recommendation quality using ranking metrics and real user feedback.
- Improve deployment, logging, monitoring, and automated testing.
- Extend the platform to support larger datasets and multiple retail locations.

## 🎓 Academic Project Information

**Project Title:** Intelligent Retail Analytics and Inventory Optimization System

**Project Domain:** Artificial Intelligence, Machine Learning, Retail Analytics, and Inventory Management

**Project Type:** Final-Year Computer Engineering Project

**Project Preview:** https://retail-frontend-e00p.onrender.com/

**Developer:** Maithilee Kubal and Divya Gurav

**GitHub:** [MDKubal-17](https://github.com/MDKubal-17), [Diya411](https://github.com/Diya411) 

## 📄 License

This project can be distributed under the MIT License if that license is selected for the repository. Before publishing, verify the licensing requirements of all integrated repositories, pretrained models, and third-party dependencies.

---

⭐ If you find this project interesting, consider starring the repository.

*Built to explore how AI and data-driven analytics can support smarter retail operations.*
