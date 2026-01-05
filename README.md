# Crossroads

Simulate how life events—having a baby, moving, changing jobs, getting married—affect your taxes and benefits.

## Installation

```bash
pip install crossroads
```

## Quick Start

```python
from crossroads import Household, Person, compare
from crossroads.events import NewChild

# Define a household
household = Household(
    state="CA",
    county="Los Angeles County",  # Required for ACA premium calculations
    members=[Person(age=30, employment_income=50000)],
)

# Simulate having a baby
result = compare(household, NewChild())

print(f"Net income change: ${result.net_income_change:,.2f}")
print(f"New benefits: {result.new_benefits}")

# Get JSON-serializable output for APIs
api_response = result.to_dict()
```

## Supported Life Events

- **NewChild**: Adding a child to the household
- **Pregnancy**: Becoming pregnant (triggers Medicaid pregnancy coverage)
- **Move**: Relocating to a different state
- **Marriage**: Combining two households
- **Divorce**: Separating households
- **JobChange**: Changing employment income
- **Unemployment**: Job loss with unemployment compensation
- **Retirement**: Transitioning from employment to Social Security
- **MedicareTransition**: Turning 65 and becoming Medicare-eligible
- **ChildAgingOut**: Child reaching age thresholds (18/19/26) for program eligibility

## License

MIT
