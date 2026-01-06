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

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Variable metadata: label, category, priority (1=primary, 2=secondary)
VARIABLE_METADATA = {
    # Income
    "household_net_income": ("Net Income", "income", 1),
    "employment_income": ("Employment Income", "income", 1),
    "self_employment_income": ("Self-Employment Income", "income", 2),
    # Taxes
    "income_tax": ("Federal Income Tax", "tax", 1),
    "state_income_tax": ("State Income Tax", "tax", 1),
    "employee_payroll_tax": ("Payroll Tax", "tax", 1),
    "self_employment_tax": ("Self-Employment Tax", "tax", 2),
    # Food assistance
    "snap": ("SNAP (Food Stamps)", "benefit", 1),
    "free_school_meals": ("Free School Meals", "benefit", 2),
    "reduced_price_school_meals": ("Reduced Price Meals", "benefit", 2),
    "school_meal_subsidy": ("School Meal Subsidy", "benefit", 2),
    "wic": ("WIC", "benefit", 1),
    # Cash assistance
    "tanf": ("TANF", "benefit", 1),
    "ssi": ("SSI", "benefit", 1),
    "social_security": ("Social Security", "benefit", 1),
    # Housing
    "spm_unit_capped_housing_subsidy": ("Housing Subsidy", "benefit", 1),
    # Healthcare
    "medicaid": ("Medicaid", "benefit", 1),
    "chip": ("CHIP", "benefit", 1),
    # Energy/utilities
    "liheap": ("LIHEAP (Energy)", "benefit", 2),
    "lifeline": ("Lifeline (Phone)", "benefit", 2),
    "acp": ("ACP (Broadband)", "benefit", 2),
    # Childcare
    "ccdf": ("Childcare Subsidy (CCDF)", "benefit", 2),
    # Tax credits - primary
    "earned_income_tax_credit": ("Earned Income Tax Credit", "credit", 1),
    "ctc": ("Child Tax Credit", "credit", 1),
    "non_refundable_ctc": ("CTC (reduces taxes)", "credit", 1),
    "refundable_ctc": ("CTC (refundable)", "credit", 2),
    "cdcc": ("Child & Dependent Care Credit", "credit", 1),
    "premium_tax_credit": ("Premium Tax Credit (ACA)", "credit", 1),
    # Tax credits - secondary
    "savers_credit": ("Saver's Credit", "credit", 2),
    "american_opportunity_credit": ("American Opportunity Credit", "credit", 2),
    "lifetime_learning_credit": ("Lifetime Learning Credit", "credit", 2),
    # State benefits & credits
    "state_eitc": ("State EITC", "state_credit", 1),
    "state_ctc": ("State CTC", "state_credit", 1),
    # California
    "ca_eitc": ("CalEITC", "state_credit", 1),
    "ca_yctc": ("CA Young Child Tax Credit", "state_credit", 1),
    "ca_renter_credit": ("CA Renter Credit", "state_credit", 2),
    "ca_tanf": ("CalWORKs (CA TANF)", "state_benefit", 1),
    "ca_state_supplement": ("CA SSI Supplement", "state_benefit", 1),
    # New York
    "ny_eitc": ("NY EITC", "state_credit", 1),
    "ny_ctc": ("NY Child Tax Credit", "state_credit", 1),
    "ny_tanf": ("NY TANF", "state_benefit", 1),
    # Colorado
    "co_eitc": ("CO EITC", "state_credit", 1),
    "co_ctc": ("CO Child Tax Credit", "state_credit", 1),
    "co_tanf": ("CO TANF", "state_benefit", 1),
    "co_state_supplement": ("CO SSI Supplement", "state_benefit", 1),
    "co_ccap_subsidy": ("CO Childcare Assistance", "state_benefit", 1),
    "co_family_affordability_credit": ("CO Family Affordability Credit", "state_credit", 1),
    # Maryland
    "md_eitc": ("MD EITC", "state_credit", 1),
    "md_ctc": ("MD Child Tax Credit", "state_credit", 1),
    # New Jersey
    "nj_eitc": ("NJ EITC", "state_credit", 1),
    "nj_ctc": ("NJ Child Tax Credit", "state_credit", 1),
    # Illinois
    "il_eitc": ("IL EITC", "state_credit", 1),
    "il_ctc": ("IL Child Tax Credit", "state_credit", 1),
    # DC
    "dc_eitc": ("DC EITC", "state_credit", 1),
    "dc_ctc": ("DC Child Tax Credit", "state_credit", 1),
    "dc_tanf": ("DC TANF", "state_benefit", 1),
    "dc_snap_temporary_local_benefit": ("DC SNAP Supplement", "state_benefit", 1),
    # Oregon
    "or_eitc": ("OR EITC", "state_credit", 1),
    "or_ctc": ("OR Child Tax Credit", "state_credit", 1),
    # New Mexico
    "nm_eitc": ("NM EITC", "state_credit", 1),
    "nm_ctc": ("NM Child Tax Credit", "state_credit", 1),
    # Massachusetts
    "ma_eitc": ("MA EITC", "state_credit", 1),
    "ma_child_and_family_credit": ("MA Child & Family Credit", "state_credit", 1),
    # Washington
    "wa_working_families_tax_credit": ("WA Working Families Credit", "state_credit", 1),
    # Connecticut
    "ct_child_tax_rebate": ("CT Child Tax Rebate", "state_credit", 1),
    "ct_property_tax_credit": ("CT Property Tax Credit", "state_credit", 2),
    # Minnesota
    "mn_child_and_working_families_credits": ("MN Working Family Credit", "state_credit", 1),
    # Other states
    "vt_eitc": ("VT EITC", "state_credit", 1),
    "vt_ctc": ("VT Child Tax Credit", "state_credit", 1),
    "me_eitc": ("ME EITC", "state_credit", 1),
    "ri_eitc": ("RI EITC", "state_credit", 1),
    "oh_eitc": ("OH EITC", "state_credit", 1),
    "ne_eitc": ("NE EITC", "state_credit", 1),
    "sc_eitc": ("SC EITC", "state_credit", 1),
    "ok_eitc": ("OK EITC", "state_credit", 1),
    "hi_eitc": ("HI EITC", "state_credit", 1),
    "ut_eitc": ("UT EITC", "state_credit", 1),
    "ut_ctc": ("UT Child Tax Credit", "state_credit", 1),
}

# Helper functions for backward compatibility
def get_label(var_name: str) -> str:
    return VARIABLE_METADATA.get(var_name, (var_name, "benefit", 2))[0]

def get_category(var_name: str) -> str:
    return VARIABLE_METADATA.get(var_name, (var_name, "benefit", 2))[1]

def get_priority(var_name: str) -> int:
    return VARIABLE_METADATA.get(var_name, (var_name, "benefit", 2))[2]


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
            spouse_employment_income=params.get("spouseIncome", 0),
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
    # Build metrics list for frontend charts
    metrics = []
    for var_name, change in result.changes.items():
        if var_name == "household_net_income":
            continue  # Skip net income from detailed metrics
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
        c.before for name, c in result.changes.items()
        if get_category(name) == "tax"
    )
    total_tax_after = sum(
        c.after for name, c in result.changes.items()
        if get_category(name) == "tax"
    )
    total_benefits_before = sum(
        c.before for name, c in result.changes.items()
        if get_category(name) in ("benefit", "credit")
    )
    total_benefits_after = sum(
        c.after for name, c in result.changes.items()
        if get_category(name) in ("benefit", "credit")
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
