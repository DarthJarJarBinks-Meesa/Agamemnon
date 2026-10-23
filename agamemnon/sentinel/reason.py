MODEL_VERSION = "local-sentinel-v1"


def assess(unit: dict, policy_label: str) -> dict:
    text = unit["text"]
    numeric = unit["kind"] == "parameter"
    marker = "CANARY-" in text
    combined = unit["kind"] == "combination"
    if marker:
        reason = "Private marker requires a reviewer."
        enablement = "high"
        risk = "high"
        confidence = "high"
    elif numeric:
        reason = "Numeric parameter may enable reproduction."
        enablement = "high"
        risk = "high"
        confidence = "high"
    elif combined:
        reason = "Combination of units may reveal an implementation."
        enablement = "moderate"
        risk = "high"
        confidence = "moderate"
    else:
        reason = "Unreviewed private unit."
        enablement = "low"
        risk = "low"
        confidence = "moderate"
    return {
        "source_policy": policy_label,
        "public_prior_art": "not_established",
        "technical_novelty_signal": "possible" if numeric or marker else "low",
        "capability_enablement": enablement,
        "reconstruction_risk": risk,
        "proposed_disposition": "REVIEW_REQUIRED",
        "confidence": confidence,
        "reason_for_review": reason,
        "model_version": MODEL_VERSION,
    }
