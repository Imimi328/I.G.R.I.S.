from typing import Any, Dict, List


VISUAL_FAMILIES = (
    "assessment-unit-status",
    "state-category-atlas",
    "resource-balance-flow",
    "extraction-pressure-dial",
    "sector-demand-composition",
    "assessment-unit-distribution",
    "historical-resource-table",
    "historical-category-shift",
    "water-quality-matrix",
    "contaminant-constellation",
    "depth-band-profile",
    "seasonal-depth-comparison",
    "decadal-rise-fall",
    "weather-water-balance",
    "seven-day-rain-strip",
    "groundwater-action-pathway",
)

VISUAL_MODES = (
    "citizen",
    "farmer",
    "policy",
    "technical",
    "compact",
    "detailed",
    "comparison",
    "source-sheet",
)

VISUALIZATION_CATALOG = tuple(
    {
        "id": f"{family}:{mode}",
        "family": family,
        "mode": mode,
    }
    for family in VISUAL_FAMILIES
    for mode in VISUAL_MODES
)


def catalog_summary() -> Dict[str, Any]:
    return {
        "recipe_count": len(VISUALIZATION_CATALOG),
        "families": list(VISUAL_FAMILIES),
        "modes": list(VISUAL_MODES),
    }


def build_visual_plan(message: str, context: Dict[str, Any], payload: Dict[str, Any] | None) -> List[Dict[str, str]]:
    text = message.lower()
    plan: List[Dict[str, str]] = []

    def add(family: str, mode: str, reason: str) -> None:
        recipe_id = f"{family}:{mode}"
        if recipe_id not in {item["recipe_id"] for item in plan}:
            plan.append({"recipe_id": recipe_id, "family": family, "mode": mode, "reason": reason})

    if payload and payload.get("type") == "block_card":
        add("assessment-unit-status", "citizen", "The answer uses a matched official assessment unit.")
    if context.get("state_data"):
        add("state-category-atlas", "source-sheet", "A state fact sheet is available for the resolved location.")
        add("resource-balance-flow", "detailed", "Recharge and extraction should be compared directly.")
        add("extraction-pressure-dial", "citizen", "Stage of extraction is the primary stress indicator.")
        add("assessment-unit-distribution", "policy", "The state contains multiple assessment categories.")
        add("sector-demand-composition", "farmer", "Demand sectors explain where groundwater is used.")
    if any(term in text for term in ("quality", "drink", "fluoride", "arsenic", "nitrate", "uranium")) or context.get("state_data", {}).get("water_quality"):
        add("water-quality-matrix", "technical", "The question or evidence includes water-quality screening data.")
        add("contaminant-constellation", "citizen", "Relative contaminant signals benefit from an immediate visual ranking.")
    if any(term in text for term in ("depth", "level", "decline", "rise", "monsoon")) or context.get("state_data", {}).get("depth_trends"):
        add("depth-band-profile", "source-sheet", "The state report contains seasonal depth observations.")
        add("seasonal-depth-comparison", "comparison", "Pre- and post-monsoon conditions should be compared.")
    if context.get("weather_data"):
        add("weather-water-balance", "farmer", "Live rain and evapotranspiration affect near-term water decisions.")
        add("seven-day-rain-strip", "compact", "The answer includes a seven-day local forecast.")
    if any(term in text for term in ("borewell", "boring", "drill", "sell", "profit", "permission", "noc")):
        add("groundwater-action-pathway", "citizen", "The question needs a decision pathway, not only a chart.")

    return plan[:10]
