"""
AI Analytics Engine - Advanced analytics capabilities.

Implements smart dataset analysis, data quality, insights, forecasting,
anomaly detection, chart recommendation, NL query, reports, and dashboards.
"""

from app.services.ai_gateway.analytics.engine import AIAnalyticsEngine, get_ai_analytics_engine

__all__ = [
    "AIAnalyticsEngine",
    "get_ai_analytics_engine",
]