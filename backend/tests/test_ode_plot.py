import unittest
from test_math_api import api, ODE


class ODEPlotTests(unittest.TestCase):

    def solve(self, method, **overrides):
        payload = {
            "method": method,
            "expression": "y",
            "t0": 0,
            "y0": 1,
            "tf": 1,
            "n_steps": 1,
        }
        payload.update(overrides)
        return api(ODE, payload)

    def test_five_methods(self):
        for method, expected in [
            ("euler", 2),
            ("taylor2", 2.5),
            ("modified_euler", 2.5),
            ("midpoint", 2.5),
            ("rk4", 65 / 24),
        ]:
            with self.subTest(method=method):
                result = self.solve(method)
                self.assertTrue(result["success"])

                plot = result["plot"]
                self.assertEqual(plot["kind"], "ode")
                self.assertEqual(plot["method"], method)
                self.assertAlmostEqual(plot["final_y"], expected)
                self.assertEqual(len(plot["steps"]), 1)

    def test_rk4_stages(self):
        step = self.solve("rk4")["plot"]["steps"][0]

        self.assertEqual(
            [stage["point"] for stage in step["stages"]],
            [[0, 1], [0.5, 1.5], [0.5, 1.75], [1, 2.75]],
        )

        self.assertEqual(
            [stage["slope"] for stage in step["stages"]],
            [1, 1.5, 1.75, 2.75],
        )

    def test_taylor_curve(self):
        step = self.solve("taylor2")["plot"]["steps"][0]

        self.assertEqual(len(step["points"]), 17)
        self.assertEqual(step["points"][0], [0, 1])
        self.assertEqual(step["points"][8], [0.5, 1.625])
        self.assertEqual(step["points"][-1], [1, 2.5])

    def test_connected_trajectory(self):
        plot = self.solve("rk4", n_steps=10)["plot"]

        self.assertEqual(len(plot["samples"]), 11)

        for first, second in zip(
            plot["steps"], plot["steps"][1:]
        ):
            self.assertEqual(first["end"], second["start"])

    def test_backward_time(self):
        plot = self.solve(
            "euler",
            expression="2",
            t0=1,
            y0=3,
            tf=0,
            n_steps=4,
        )["plot"]

        self.assertAlmostEqual(plot["final_y"], 1)
        self.assertLess(plot["steps"][0]["h"], 0)
        self.assertEqual(plot["final_t"], 0)

    def test_plot_limits_preserve_calculation(self):
        result = self.solve("euler", n_steps=73)
        self.assertTrue(result["success"])
        self.assertIsNone(result["plot"])
        self.assertEqual(len(result["trajectory"]), 74)

    def test_zero_duration(self):
        result = self.solve("euler", tf=0)
        self.assertTrue(result["success"])
        self.assertEqual(result["final_y"], 1)
        self.assertIsNone(result["plot"])

    def test_stage_bounds(self):
        plot = self.solve("rk4")["plot"]

        for step in plot["steps"]:
            for stage in step["stages"]:
                for t, y in stage["guide"]:
                    self.assertLessEqual(plot["domain"][0], t)
                    self.assertLessEqual(t, plot["domain"][1])
                    self.assertLessEqual(plot["range"][0], y)
                    self.assertLessEqual(y, plot["range"][1])
