import math
import numpy as np


def build_newton_plot(f, result, expression):
    steps = [
        item["geometry"]
        for item in result.get("iterations", [])
        if "geometry" in item
    ]

    if not steps:
        return None

    for step in steps:
        if not all(math.isfinite(v) for v in step.values()):
            return None

    positions = [
        value
        for step in steps
        for value in (step["x"], step["next_x"])
    ]

    low, high = min(positions), max(positions)
    span = max(high - low, 2.0)
    center = low + (high - low) / 2

    xmin = center - span * 0.7
    xmax = center + span * 0.7

    if not math.isfinite(xmin) or not math.isfinite(xmax):
        return None

    if xmin >= xmax:
        return None

    samples = []

    with np.errstate(all="ignore"):
        for x in np.linspace(xmin, xmax, 241):
            try:
                y = float(f(float(x)))
                if not math.isfinite(y):
                    y = None
            except (ArithmeticError, TypeError, ValueError):
                y = None

            samples.append([float(x), y])

    values = [
        y for _, y in samples
        if y is not None
    ]

    if not values:
        return None

    values.extend(step["fx"] for step in steps)
    values.append(0.0)

    ymin, ymax = min(values), max(values)
    yspan = max(ymax - ymin, 0.1)

    if not math.isfinite(yspan):
        return None

    ymin -= yspan * 0.08
    ymax += yspan * 0.08

    if not all(map(math.isfinite, [ymin, ymax])):
        return None

    if ymax <= ymin:
        return None

    return {
        "kind": "newton",
        "expression": expression,
        "domain": [xmin, xmax],
        "range": [ymin, ymax],
        "samples": samples,
        "steps": steps,
        "converged": result.get("converged", False),
        "root": result.get("root"),
    }
