# JunkQuote Standard Library v1.0

The JunkQuote Standard Library gives new companies a practical residential junk-removal starting point. Its base item prices are intentionally conservative so that a recognizable item does not carry hidden access, labor, travel, or disposal assumptions.

Final estimate pricing should be composed from:

- the selected item's base price;
- Pricing Rules and access modifiers;
- crew labor;
- disposal and environmental fees;
- mileage, distance, and fuel charges;
- documented manual adjustments.

Concrete, dirt, large brush, whole-house cleanouts, demolition, large sheds, and large decks are marked **Estimate Required**. They carry no default base price and require an estimator to review the actual scope.

## First-run multiplier

During onboarding, the company selects a market:

- Budget Market: `0.90`
- Standard: `1.00`
- High Cost: `1.15`
- Premium: `1.30`

The multiplier is applied once to the initial Standard Library. It does not monitor or automatically reprice a customized company.

## Reset behavior

The explicit **Reset Standard Library** action replaces only the company's Item Library. Historical estimate-item snapshots remain unchanged. Profile item overrides can either be cleared or preserved when their category and item name match a Standard Library item.

Customers, properties, estimates, invoices, analytics, jobs, crews, and Pricing Rules are never reset by this action.
