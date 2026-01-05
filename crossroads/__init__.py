"""Crossroads: Simulate how life events affect your taxes and benefits."""

from .compare import BenefitChange, ComparisonResult, compare
from .household import Household, Person

__version__ = "0.1.0"

__all__ = [
    "BenefitChange",
    "ComparisonResult",
    "Household",
    "Person",
    "compare",
]
