"""Flask API for Crossroads simulations."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from .compare import compare
from .events import (
    ChildAgingOut,
    Divorce,
    JobChange,
    Marriage,
    MedicareTransition,
    Move,
    NewChild,
    Pregnancy,
    Retirement,
    Unemployment,
)
from .household import Household, Person

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Human-readable labels for variables
VARIABLE_LABELS = {
    "household_net_income": "Net Income",
    "employment_income": "Employment Income",
    "income_tax": "Federal Income Tax",
    "state_income_tax": "State Income Tax",
    "employee_payroll_tax": "Payroll Tax",
    "self_employment_tax": "Self-Employment Tax",
    "snap": "SNAP Benefits",
    "tanf": "TANF",
    "ssi": "SSI",
    "social_security": "Social Security",
    "earned_income_tax_credit": "Earned Income Tax Credit",
    "child_tax_credit": "Child Tax Credit",
    "refundable_ctc": "Refundable CTC",
    "premium_tax_credit": "Premium Tax Credit (ACA)",
    "medicaid": "Medicaid",
    "chip": "CHIP",
}

# Category mapping for frontend display
VARIABLE_CATEGORIES = {
    "household_net_income": "income",
    "employment_income": "income",
    "income_tax": "tax",
    "state_income_tax": "tax",
    "employee_payroll_tax": "tax",
    "self_employment_tax": "tax",
    "snap": "benefit",
    "tanf": "benefit",
    "ssi": "benefit",
    "social_security": "benefit",
    "earned_income_tax_credit": "credit",
    "child_tax_credit": "credit",
    "refundable_ctc": "credit",
    "premium_tax_credit": "credit",
    "medicaid": "benefit",
    "chip": "benefit",
}


def create_household_from_request(data: dict) -> Household:
    """Convert frontend household format to backend Household."""
    members = []

    # Create head of household
    head = Person(
        age=data.get("age", 30),
        employment_income=data.get("income", 0),
        is_tax_unit_head=True,
    )
    members.append(head)

    # Add spouse if married (jointly or separately)
    filing_status = data.get("filingStatus", "single")
    if filing_status in ("married_jointly", "married_separately"):
        spouse = Person(
            age=data.get("spouseAge", data.get("age", 30)),
            employment_income=data.get("spouseIncome", 0),
            is_tax_unit_spouse=True,
        )
        members.append(spouse)

    # Add children from childAges array
    child_ages = data.get("childAges", [])
    for age in child_ages:
        child = Person(age=age)
        members.append(child)

    return Household(
        state=data.get("state", "CA"),
        members=members,
        year=data.get("year", 2024),
    )


def create_event_from_request(event_type: str, params: dict, household: Household):
    """Convert frontend event type to backend LifeEvent."""
    event_map = {
        "having_baby": lambda: NewChild(),
        "moving_states": lambda: Move(new_state=params.get("newState", "TX")),
        "getting_married": lambda: Marriage(
            spouse_age=params.get("spouseAge", 30),
            spouse_income=params.get("spouseIncome", 0),
        ),
        "changing_income": lambda: JobChange(
            new_income=household.members[0].employment_income
            * (1 + params.get("percentChange", 20) / 100)
        ),
        "retiring": lambda: Retirement(),
        "divorce": lambda: Divorce(),
        "pregnancy": lambda: Pregnancy(),
        "unemployment": lambda: Unemployment(
            unemployment_compensation=params.get("unemploymentBenefits", 15000)
        ),
        "medicare_transition": lambda: MedicareTransition(),
        "child_aging_out": lambda: ChildAgingOut(),
    }

    if event_type not in event_map:
        raise ValueError(f"Unknown event type: {event_type}")

    return event_map[event_type]()


def format_result_for_frontend(result) -> dict:
    """Convert ComparisonResult to frontend-expected format."""
    # Build metrics list for frontend charts
    metrics = []
    for var_name, change in result.changes.items():
        if var_name == "household_net_income":
            continue  # Skip net income from detailed metrics
        metrics.append({
            "name": var_name,
            "label": VARIABLE_LABELS.get(var_name, var_name),
            "before": change.before,
            "after": change.after,
            "category": VARIABLE_CATEGORIES.get(var_name, "benefit"),
        })

    # Calculate totals
    total_tax_before = sum(
        c.before for name, c in result.changes.items()
        if VARIABLE_CATEGORIES.get(name) == "tax"
    )
    total_tax_after = sum(
        c.after for name, c in result.changes.items()
        if VARIABLE_CATEGORIES.get(name) == "tax"
    )
    total_benefits_before = sum(
        c.before for name, c in result.changes.items()
        if VARIABLE_CATEGORIES.get(name) in ("benefit", "credit")
    )
    total_benefits_after = sum(
        c.after for name, c in result.changes.items()
        if VARIABLE_CATEGORIES.get(name) in ("benefit", "credit")
    )

    return {
        "before": {
            "netIncome": result.net_income_before,
            "totalTax": total_tax_before,
            "totalBenefits": total_benefits_before,
            "metrics": metrics,
        },
        "after": {
            "netIncome": result.net_income_after,
            "totalTax": total_tax_after,
            "totalBenefits": total_benefits_after,
            "metrics": [
                {**m, "before": m["after"]} for m in metrics
            ],
        },
        "diff": {
            "netIncome": result.net_income_change,
            "totalTax": total_tax_after - total_tax_before,
            "totalBenefits": total_benefits_after - total_benefits_before,
        },
        "event": {
            "name": result.event.name,
            "description": result.event.description,
        },
    }


@app.route("/api/simulate", methods=["POST"])
def simulate():
    """Run a life event simulation."""
    try:
        data = request.get_json()

        household_data = data.get("household", {})
        event_data = data.get("lifeEvent", {})

        household = create_household_from_request(household_data)
        event = create_event_from_request(
            event_data.get("type"),
            event_data.get("params", {}),
            household,
        )

        result = compare(household, event)
        return jsonify(format_result_for_frontend(result))

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Simulation failed: {str(e)}"}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
