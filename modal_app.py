"""Modal app for Crossroads simulations - faster serverless compute."""

import modal

# Create the Modal app
app = modal.App("crossroads-api")

# Define the container image with PolicyEngine installed
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "policyengine-us>=1.0.0",
        "fastapi",
    )
    .add_local_dir("crossroads", "/root/crossroads")
)


@app.function(
    image=image,
    min_containers=1,  # Keep one container warm to avoid cold starts
    timeout=300,
    memory=2048,
)
@modal.fastapi_endpoint(method="POST", docs=True)
def simulate(data: dict) -> dict:
    """Run a life event simulation."""
    import sys
    sys.path.insert(0, "/root")

    from crossroads.compare import compare
    from crossroads.events import (
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
    from crossroads.household import Household, Person

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
        "child_tax_credit": ("Child Tax Credit", "credit", 1),
        "refundable_ctc": ("Refundable CTC", "credit", 2),
        "cdcc": ("Child & Dependent Care Credit", "credit", 1),
        "premium_tax_credit": ("Premium Tax Credit (ACA)", "credit", 1),
        # Tax credits - secondary
        "ctc_refundable_maximum": ("CTC Refundable Max", "credit", 2),
        "additional_child_tax_credit": ("Additional CTC", "credit", 2),
        "savers_credit": ("Saver's Credit", "credit", 2),
        "american_opportunity_credit": ("American Opportunity Credit", "credit", 2),
        "lifetime_learning_credit": ("Lifetime Learning Credit", "credit", 2),
    }

    def get_label(var_name):
        return VARIABLE_METADATA.get(var_name, (var_name, "benefit", 2))[0]

    def get_category(var_name):
        return VARIABLE_METADATA.get(var_name, (var_name, "benefit", 2))[1]

    def get_priority(var_name):
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

    try:
        household_data = data.get("household", {})
        event_data = data.get("lifeEvent", {})

        household = create_household_from_request(household_data)
        event = create_event_from_request(
            event_data.get("type"),
            event_data.get("params", {}),
            household,
        )

        result = compare(household, event)
        return format_result_for_frontend(result)

    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Simulation failed: {str(e)}"}


@app.function(image=image)
@modal.fastapi_endpoint(method="GET", docs=True)
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}
