import math

MAX_PLOT_STEPS = 72


def make_ode_step(method, index, t, y, tn, yn, h,
                  slopes, derivative=None):

    def stage(label, st, sy, slope):
        dt = h * 0.18

        return {
            "label": label,
            "point": [st, sy],
            "slope": slope,
            "guide": [
                [st, sy],
                [st + dt, sy + dt * slope],
            ],
        }

    k1 = slopes[0]
    stages = [stage("k1", t, y, k1)]

    if method == "modified_euler":
        stages.append(
            stage("k2", tn, y + h * k1, slopes[1])
        )

    elif method in ("midpoint", "rk4"):
        stages.append(
            stage("k2", t + h / 2,
                  y + h * k1 / 2, slopes[1])
        )

    if method == "rk4":
        stages.extend([
            stage("k3", t + h / 2,
                  y + h * slopes[1] / 2, slopes[2]),
            stage("k4", t + h,
                  y + h * slopes[2], slopes[3]),
        ])

    if method == "taylor2":
        points = []

        for i in range(17):
            dt = h * i / 16
            points.append([
                t + dt,
                y + dt * k1 + 0.5 * dt * dt * derivative,
            ])

        points[-1] = [tn, yn]
    else:
        points = [[t, y], [tn, yn]]

    result = {
        "label": f"Paso {index}",
        "start": [t, y],
        "end": [tn, yn],
        "value": yn,
        "h": h,
        "points": points,
        "stages": stages,
    }

    if derivative is not None:
        result["derivative"] = derivative

    return result


def build_ode_plot(method, expression, steps):
    if not steps or len(steps) > MAX_PLOT_STEPS:
        return None

    if steps[0]["h"] == 0:
        return None

    samples = [steps[0]["start"]]
    bounds = [steps[0]["start"]]

    for step in steps:
        samples.append(step["end"])
        bounds.extend(step["points"])

        for stage in step["stages"]:
            bounds.extend(stage["guide"])

            if not math.isfinite(stage["slope"]):
                return None

        if not math.isfinite(step["value"]):
            return None

        if "derivative" in step:
            if not math.isfinite(step["derivative"]):
                return None

    if not all(
        math.isfinite(value)
        for point in bounds
        for value in point
    ):
        return None

    ts = [point[0] for point in bounds]
    ys = [0.0] + [point[1] for point in bounds]

    tmin, tmax = min(ts), max(ts)
    ymin, ymax = min(ys), max(ys)

    tspan = tmax - tmin
    yspan = max(ymax - ymin, 0.1)

    domain = [
        tmin - tspan * 0.05,
        tmax + tspan * 0.05,
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
        "kind": "ode",
        "method": method,
        "expression": expression,
        "title": f"dy/dt = {expression}",
        "domain": domain,
        "range": yrange,
        "samples": samples,
        "steps": steps,
        "final_t": samples[-1][0],
        "final_y": samples[-1][1],
    }
