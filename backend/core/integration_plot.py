import math
import numpy as np


RULES = {
    "trapezoid": (1, [1, 1], 1 / 2),
    "simpson_1_3": (2, [1, 4, 1], 1 / 3),
    "simpson_3_8": (3, [1, 3, 3, 1], 3 / 8),
}


def build_integration_plot(kind, f, xs, ys, integral):
    stride, weights, factor = RULES[kind]
    n = len(xs) - 1

    # Limitar exclusivamente el coste de visualizacion.
    if n < stride or n > 72 or n % stride:
        return None

    a, b = float(xs[0]), float(xs[-1])
    h = (b - a) / n

    if not math.isfinite(h) or h == 0:
        return None

    if not np.all(np.isfinite(xs)):
        return None

    if not np.all(np.isfinite(ys)):
        return None

    if not math.isfinite(float(integral)):
        return None

    try:
        return _build(
            kind, f, xs, ys, integral,
            stride, weights, factor, a, b, h
        )
    except (ArithmeticError, TypeError, ValueError):
        return None


def _build(kind, f, xs, ys, integral,
           stride, weights, factor, a, b, h):

    samples = []
    nodes = [
        [float(x), float(y)]
        for x, y in zip(xs, ys)
    ]

    with np.errstate(all="ignore"):
        for x in np.linspace(min(a, b), max(a, b), 241):
            y = float(f(float(x)))

            if not math.isfinite(y):
                return None

            samples.append([float(x), y])

    steps = []
    accumulated = 0.0

    for start in range(0, len(xs) - 1, stride):
        values = [
            float(y)
            for y in ys[start:start + stride + 1]
        ]

        left = float(xs[start])
        right = float(xs[start + stride])

        if left == right:
            return None

        # Interpolacion local usando una coordenada normalizada.
        # Grado 1 para trapecio, 2 y 3 para Simpson.
        def polynomial(t):
            result = 0.0

            for i, y in enumerate(values):
                basis = 1.0

                for j in range(stride + 1):
                    if i != j:
                        basis *= (t - j) / (i - j)

                result += y * basis

            return result

        points = []

        for t in np.linspace(0, stride, 25):
            x = left + (right - left) * float(t) / stride
            y = polynomial(float(t))

            if not math.isfinite(x) or not math.isfinite(y):
                return None

            points.append([x, y])

        contribution = h * factor * math.fsum(
            weight * value
            for weight, value in zip(weights, values)
        )

        accumulated += contribution

        if not math.isfinite(accumulated):
            return None

        steps.append({
            "label": f"Bloque {len(steps) + 1}",
            "a": left,
            "b": right,
            "value": accumulated,
            "contribution": contribution,
            "points": points,
            "node_indices": list(
                range(start, start + stride + 1)
            ),
        })

    values = [0.0]
    values.extend(y for _, y in samples)
    values.extend(y for _, y in nodes)

    for step in steps:
        values.extend(y for _, y in step["points"])

    xmin, xmax = min(a, b), max(a, b)
    ymin, ymax = min(values), max(values)

    xspan = xmax - xmin
    yspan = max(ymax - ymin, 0.1)

    domain = [
        xmin - xspan * 0.05,
        xmax + xspan * 0.05,
    ]

    yrange = [
        ymin - yspan * 0.08,
        ymax + yspan * 0.08,
    ]

    if not all(map(math.isfinite, domain + yrange)):
        return None

    if domain[0] >= domain[1] or yrange[0] >= yrange[1]:
        return None

    return {
        "kind": kind,
        "domain": domain,
        "range": yrange,
        "samples": samples,
        "nodes": nodes,
        "steps": steps,
        "integral": float(integral),
        "direction": 1 if b > a else -1,
    }
