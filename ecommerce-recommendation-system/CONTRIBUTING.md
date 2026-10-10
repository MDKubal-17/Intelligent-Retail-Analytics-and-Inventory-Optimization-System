# Contributing Guide

Thank you for your interest in contributing! This document explains how to set
up your development environment, coding standards, and the pull-request process.

---

## Development Setup

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/ecommerce-recommendation-system.git
cd ecommerce-recommendation-system

# 2. Create a virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 3. Install all dependencies (including dev tools)
pip install -r requirements.txt
pip install flake8 black isort bandit pytest-cov

# 4. Generate the dataset and run the pipeline
python data/generate_dataset.py
python src/preprocessing/data_processor.py
python src/train.py
```

---

## Code Style

| Tool | Purpose | Command |
|------|---------|---------|
| **black** | Auto-formatter | `black src/ api/ --line-length=100` |
| **isort** | Import ordering | `isort src/ api/ --profile black` |
| **flake8** | Linting | `flake8 src/ api/ --max-line-length=100` |

Run all checks at once:
```bash
black src/ api/ --line-length=100 && isort src/ api/ --profile black && flake8 src/ api/ --max-line-length=100
```

---

## Testing

```bash
# Run full test suite with coverage
pytest tests/ -v --cov=src --cov-report=term-missing

# Run a specific test module
pytest tests/test_recommendation_engine.py -v -k "TestMetrics"
```

All new code must have at least **70% test coverage**. The CI pipeline will
fail if coverage drops below this threshold.

---

## Pull Request Process

1. Create a feature branch from `develop`: `git checkout -b feature/your-feature-name`
2. Make your changes with clear commit messages (use [Conventional Commits](https://www.conventionalcommits.org/))
3. Add or update tests for any new behaviour
4. Ensure all CI checks pass locally before pushing
5. Open a pull request against `develop` with a clear description

### Commit Message Format
```
type(scope): short description

Examples:
feat(models): add LightGCN graph-based collaborative filter
fix(api): handle missing user ID gracefully with 404 response
docs(readme): update installation instructions for Windows
test(evaluation): add NDCG edge-case tests
refactor(engine): extract hybrid scoring into separate method
```

---

## Project Structure Conventions

- All model classes must implement `fit()`, `recommend()`, `save()`, and `load()`.
- New API endpoints go in `api/main.py` and must include Pydantic response models.
- All functions must have NumPy-style docstrings.
- Place utility functions shared across modules in `src/utils/`.

---

## Reporting Bugs

Open a GitHub issue using the **Bug Report** template and include:
- Python version and OS
- Full error traceback
- Steps to reproduce

We aim to respond to all issues within 48 hours.
