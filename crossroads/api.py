"""Flask API for Crossroads simulations."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from .compare import compare
from .events import (
    ChildAgingOut,
    Divorce,
    JobChange,
    LosingESI,
    Marriage,
    MedicareTransition,
    Move,
    NewChild,
    Pregnancy,
    Retirement,
    Unemployment,
)
from .household import Household, Person
from .metadata import get_category, get_label, get_priority

app = Flask(__name__)
CORS(app)


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

    # Add spouse if married
    filing_status = data.get("filingStatus", "single")
    if filing_status in ("married_jointly", "married_separately"):
        spouse = Person(
            age=data.get("spouseAge", data.get("age", 30)),
            employment_income=data.get("spouseIncome", 0),
            is_tax_unit_spouse=True,
        )
        members.append(spouse)

    # Add children
    for age in data.get("childAges", []):
        members.append(Person(age=age))

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
            spouse_employment_income=params.get("spouseIncome", 0),
            spouse_children=[Person(age=age) for age in params.get("spouseChildAges", [])],
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
        "losing_esi": lambda: LosingESI(),
    }

    if event_type not in event_map:
        raise ValueError(f"Unknown event type: {event_type}")

    return event_map[event_type]()


def format_result_for_frontend(result) -> dict:
    """Convert ComparisonResult to frontend-expected format."""
    metrics = []
    for var_name, change in result.changes.items():
        if var_name == "household_net_income":
            continue
        metrics.append({
            "name": var_name,
            "label": get_label(var_name),
            "before": change.before,
            "after": change.after,
            "category": get_category(var_name),
            "priority": get_priority(var_name),
        })

    # Calculate totals
    total_tax_before = sum(
        c.before for name, c in result.changes.items() if get_category(name) == "tax"
    )
    total_tax_after = sum(
        c.after for name, c in result.changes.items() if get_category(name) == "tax"
    )
    total_benefits_before = sum(
        c.before for name, c in result.changes.items()
        if get_category(name) in ("benefit", "credit")
    )
    total_benefits_after = sum(
        c.after for name, c in result.changes.items()
        if get_category(name) in ("benefit", "credit")
    )

    response = {
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
            "metrics": [{**m, "before": m["after"]} for m in metrics],
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

    # Add healthcare coverage info if available
    if result.healthcare_before:
        response["healthcareBefore"] = result.healthcare_before.to_dict()
    if result.healthcare_after:
        response["healthcareAfter"] = result.healthcare_after.to_dict()

    return response


@app.route("/api/simulate", methods=["POST"])
def simulate():
    """Run a life event simulation."""
    try:
        data = request.get_json()
        household = create_household_from_request(data.get("household", {}))
        event = create_event_from_request(
            data.get("lifeEvent", {}).get("type"),
            data.get("lifeEvent", {}).get("params", {}),
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
