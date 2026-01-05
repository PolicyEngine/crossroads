"""Compare function for running before/after simulations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from policyengine_us import Simulation

from .events.base import LifeEvent
from .household import Household


# Key variables to track in comparisons
OUTPUT_VARIABLES = [
    # Net income
    "household_net_income",
    # Tax liability
    "income_tax",
    "employee_payroll_tax",
    "self_employment_tax",
    # Major federal benefits
    "snap",
    "tanf",
    "ssi",
    "social_security",
    # Tax credits
    "earned_income_tax_credit",
    "child_tax_credit",
    "refundable_ctc",
    # Healthcare
    "premium_tax_credit",
    "medicaid",
]


@dataclass
class BenefitChange:
    """Represents a change in a specific benefit or tax."""

    name: str
    before: float
    after: float

    @property
    def change(self) -> float:
        return self.after - self.before

    @property
    def percent_change(self) -> float | None:
        if self.before == 0:
            return None
        return (self.after - self.before) / self.before * 100

    def to_dict(self) -> dict[str, Any]:
        """Convert to JSON-serializable dictionary."""
        return {
            "name": self.name,
            "before": self.before,
            "after": self.after,
            "change": self.change,
            "percent_change": self.percent_change,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "BenefitChange":
        """Create from dictionary."""
        return cls(
            name=data["name"],
            before=data["before"],
            after=data["after"],
        )


@dataclass
class ComparisonResult:
    """Result of comparing a household before and after a life event."""

    event: LifeEvent
    before_situation: dict[str, Any]
    after_situation: dict[str, Any]
    changes: dict[str, BenefitChange] = field(default_factory=dict)

    @property
    def net_income_before(self) -> float:
        return self.changes.get("household_net_income", BenefitChange("", 0, 0)).before

    @property
    def net_income_after(self) -> float:
        return self.changes.get("household_net_income", BenefitChange("", 0, 0)).after

    @property
    def net_income_change(self) -> float:
        return self.net_income_after - self.net_income_before

    @property
    def tax_liability_before(self) -> float:
        """Total tax liability before the event."""
        taxes = ["income_tax", "employee_payroll_tax", "self_employment_tax"]
        return sum(
            self.changes.get(t, BenefitChange("", 0, 0)).before
            for t in taxes
        )

    @property
    def tax_liability_after(self) -> float:
        """Total tax liability after the event."""
        taxes = ["income_tax", "employee_payroll_tax", "self_employment_tax"]
        return sum(
            self.changes.get(t, BenefitChange("", 0, 0)).after
            for t in taxes
        )

    @property
    def tax_change(self) -> float:
        return self.tax_liability_after - self.tax_liability_before

    @property
    def new_benefits(self) -> list[str]:
        """Benefits that were zero before but positive after."""
        result = []
        benefit_vars = [
            "snap", "tanf", "ssi", "earned_income_tax_credit",
            "child_tax_credit", "refundable_ctc", "premium_tax_credit",
        ]
        for var in benefit_vars:
            if var in self.changes:
                change = self.changes[var]
                if change.before == 0 and change.after > 0:
                    result.append(var)
        return result

    @property
    def lost_benefits(self) -> list[str]:
        """Benefits that were positive before but zero after."""
        result = []
        benefit_vars = [
            "snap", "tanf", "ssi", "earned_income_tax_credit",
            "child_tax_credit", "refundable_ctc", "premium_tax_credit",
        ]
        for var in benefit_vars:
            if var in self.changes:
                change = self.changes[var]
                if change.before > 0 and change.after == 0:
                    result.append(var)
        return result

    def summary(self) -> str:
        """Generate a human-readable summary of the comparison."""
        lines = [
            f"Life Event: {self.event.name}",
            f"  {self.event.description}",
            "",
            "Net Income:",
            f"  Before: ${self.net_income_before:,.2f}",
            f"  After:  ${self.net_income_after:,.2f}",
            f"  Change: ${self.net_income_change:+,.2f}",
            "",
            "Tax Liability:",
            f"  Before: ${self.tax_liability_before:,.2f}",
            f"  After:  ${self.tax_liability_after:,.2f}",
            f"  Change: ${self.tax_change:+,.2f}",
        ]

        if self.new_benefits:
            lines.append("")
            lines.append("New Benefits Gained:")
            for b in self.new_benefits:
                amount = self.changes[b].after
                lines.append(f"  - {b}: ${amount:,.2f}")

        if self.lost_benefits:
            lines.append("")
            lines.append("Benefits Lost:")
            for b in self.lost_benefits:
                amount = self.changes[b].before
                lines.append(f"  - {b}: ${amount:,.2f}")

        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        """
        Convert to JSON-serializable dictionary for API responses.

        Returns a dictionary with computed properties included for
        frontend consumption.
        """
        return {
            "event": {
                "name": self.event.name,
                "description": self.event.description,
                "type": self.event.__class__.__name__,
            },
            "before_situation": self.before_situation,
            "after_situation": self.after_situation,
            "changes": {k: v.to_dict() for k, v in self.changes.items()},
            "summary": {
                "net_income": {
                    "before": self.net_income_before,
                    "after": self.net_income_after,
                    "change": self.net_income_change,
                },
                "tax_liability": {
                    "before": self.tax_liability_before,
                    "after": self.tax_liability_after,
                    "change": self.tax_change,
                },
                "new_benefits": self.new_benefits,
                "lost_benefits": self.lost_benefits,
            },
        }


def _run_simulation(situation: dict[str, Any], year: int) -> dict[str, float]:
    """Run a PolicyEngine simulation and extract key outputs."""
    sim = Simulation(situation=situation)
    results = {}

    for var in OUTPUT_VARIABLES:
        try:
            value = sim.calculate(var, year)
            # Sum across all entities if array
            if hasattr(value, "__iter__"):
                results[var] = float(sum(value))
            else:
                results[var] = float(value)
        except Exception:
            results[var] = 0.0

    return results


def compare(
    household: Household,
    event: LifeEvent,
    variables: list[str] | None = None,
) -> ComparisonResult:
    """
    Compare a household's taxes and benefits before and after a life event.

    Args:
        household: The baseline household before the event.
        event: The life event to simulate.
        variables: Optional list of variables to compare. Defaults to
            OUTPUT_VARIABLES.

    Returns:
        A ComparisonResult containing the before/after comparison.

    Raises:
        ValueError: If the life event cannot be applied to the household.
    """
    # Validate the event can be applied
    errors = event.validate(household)
    if errors:
        raise ValueError(f"Cannot apply {event.name}: {'; '.join(errors)}")

    # Get before and after situations
    before_situation = household.to_situation()
    after_household = event.apply(household)
    after_situation = after_household.to_situation()

    # Run simulations
    before_results = _run_simulation(before_situation, household.year)
    after_results = _run_simulation(after_situation, after_household.year)

    # Build changes dictionary
    vars_to_compare = variables or OUTPUT_VARIABLES
    changes = {}
    for var in vars_to_compare:
        before_val = before_results.get(var, 0.0)
        after_val = after_results.get(var, 0.0)
        changes[var] = BenefitChange(
            name=var,
            before=before_val,
            after=after_val,
        )

    return ComparisonResult(
        event=event,
        before_situation=before_situation,
        after_situation=after_situation,
        changes=changes,
    )
