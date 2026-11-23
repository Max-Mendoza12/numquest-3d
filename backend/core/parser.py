import sympy as sp
import numpy as np
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
)

# Permite escribir "2x" en lugar de exigir "2*x" y "^" para potencias
TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application,)

def build_function(expr_str: str, var_name: str = "x"):
    """
    Convierte un string matemático en:
    - f: función numérica evaluable f(x)
    - df: primera derivada numérica f'(x)
    - d2f: segunda derivada numérica f''(x)
    - latex: representación en LaTeX para mostrar bonita en la pantalla / VR
    """
    x = sp.Symbol(var_name)
    clean_str = expr_str.replace("^", "**")

    local_dict = {"e": sp.E, "pi": sp.pi, var_name: x}
    expr = parse_expr(clean_str, local_dict=local_dict, transformations=TRANSFORMATIONS)

    d1_expr = sp.diff(expr, x)
    d2_expr = sp.diff(d1_expr, x)

    f = sp.lambdify(x, expr, modules=["numpy"])
    df = sp.lambdify(x, d1_expr, modules=["numpy"])
    d2f = sp.lambdify(x, d2_expr, modules=["numpy"])

    return {
        "f": f,
        "df": df,
        "d2f": d2f,
        "latex": sp.latex(expr),
        "d1_latex": sp.latex(d1_expr),
        "expr": expr,
    }