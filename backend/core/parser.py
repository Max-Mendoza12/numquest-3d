import ast
import math
import re
import sympy as sp

FUNCTIONS = {
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "asin": sp.asin,
    "acos": sp.acos,
    "atan": sp.atan,
    "sinh": sp.sinh,
    "cosh": sp.cosh,
    "tanh": sp.tanh,
    "sqrt": sp.sqrt,
    "exp": sp.exp,
    "log": sp.log,
    "ln": sp.log,
    "abs": sp.Abs,
    "Abs": sp.Abs,
}

CONSTANTS = {
    "pi": sp.pi,
    "e": sp.E,
    "E": sp.E,
}

TOKEN = re.compile(
    r"(?P<number>(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)"
    r"(?:[eE][+-]?[0-9]+)?)"
    r"|(?P<name>[A-Za-z]+)"
    r"|(?P<op>\*\*|[+*/^()\-])"
    r"|(?P<space>\s+)"
)


def normalize_expression(source, symbols):
    if not isinstance(source, str) or not source.strip():
        raise ValueError("Expresion vacia")

    if len(source) > 256:
        raise ValueError("Expresion demasiado larga")

    tokens = []
    pos = 0
    nesting = 0

    while pos < len(source):
        match = TOKEN.match(source, pos)

        if match is None:
            raise ValueError("Caracter no permitido")

        pos = match.end()
        kind = match.lastgroup
        value = match.group()

        if kind == "space":
            continue

        if kind == "name":
            if value not in symbols and value not in CONSTANTS and value not in FUNCTIONS:
                raise ValueError("Simbolo no permitido: " + value)

        if value == "(":
            nesting += 1
        elif value == ")":
            nesting -= 1

        if nesting < 0 or nesting > 16:
            raise ValueError("Parentesis invalidos")

        tokens.append((kind, value))

        if len(tokens) > 96:
            raise ValueError("Expresion demasiado compleja")

    if nesting != 0:
        raise ValueError("Parentesis sin cerrar")

    output = []

    for i, (kind, value) in enumerate(tokens):
        if value in FUNCTIONS:
            if i + 1 == len(tokens) or tokens[i+1][1] != "(":
                raise ValueError("Las funciones requieren parentesis")

        if i:
            prev_kind, prev = tokens[i-1]

            if prev_kind == "number" and kind == "number":
                raise ValueError("Numeros consecutivos invalidos")

            ends_atom = (
                prev_kind in ("number", "name") or prev == ")"
            )

            starts_atom = (
                kind in ("number", "name") or value == "("
            )

            function_call = prev in FUNCTIONS and value == "("

            if ends_atom and starts_atom and not function_call:
                output.append("*")

        output.append("**" if value == "^" else value)

    return "".join(output)


def parse_math_expression(source, symbols):
    normalized = normalize_expression(source, symbols)

    try:
        tree = ast.parse(normalized, mode="eval")
    except SyntaxError as exc:
        raise ValueError("Sintaxis matematica invalida") from exc

    if sum(1 for _ in ast.walk(tree)) > 160:
        raise ValueError("Expresion demasiado compleja")

    def build(node, depth=0):
        if depth > 24:
            raise ValueError("Expresion demasiado profunda")

        if isinstance(node, ast.Constant):
            value = node.value

            if type(value) not in (int, float):
                raise ValueError("Numero no permitido")

            if abs(value) > 1e100 or not math.isfinite(value):
                raise ValueError("Numero fuera de rango")

            return (
                sp.Integer(value)
                if type(value) is int
                else sp.Float(value)
            )

        if isinstance(node, ast.Name):
            if node.id in symbols:
                return symbols[node.id]

            if node.id in CONSTANTS:
                return CONSTANTS[node.id]

            raise ValueError("Simbolo no permitido")

        if isinstance(node, ast.UnaryOp):
            value = build(node.operand, depth+1)

            if isinstance(node.op, ast.UAdd):
                return value

            if isinstance(node.op, ast.USub):
                return sp.Mul(-1, value, evaluate=False)

            raise ValueError("Operador no permitido")

        if isinstance(node, ast.BinOp):
            if isinstance(node.op, ast.Pow):
                if any(
                    isinstance(n, ast.BinOp)
                    and isinstance(n.op, ast.Pow)
                    for n in ast.walk(node.right)
                ):
                    raise ValueError("Exponente anidado no permitido")

                exponent = node.right

                if isinstance(exponent, ast.UnaryOp):
                    exponent = exponent.operand

                if isinstance(exponent, ast.Constant):
                    if abs(exponent.value) > 100:
                        raise ValueError("Exponente demasiado grande")

            left = build(node.left, depth+1)
            right = build(node.right, depth+1)

            if isinstance(node.op, ast.Add):
                return sp.Add(left, right, evaluate=False)

            if isinstance(node.op, ast.Sub):
                return sp.Add(
                    left,
                    sp.Mul(-1, right, evaluate=False),
                    evaluate=False
                )

            if isinstance(node.op, ast.Mult):
                return sp.Mul(left, right, evaluate=False)

            if isinstance(node.op, ast.Div):
                return sp.Mul(
                    left,
                    sp.Pow(right, -1, evaluate=False),
                    evaluate=False
                )

            if isinstance(node.op, ast.Pow):
                return sp.Pow(left, right, evaluate=False)

            raise ValueError("Operador no permitido")

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise ValueError("Funcion no permitida")

            name = node.func.id

            if name not in FUNCTIONS:
                raise ValueError("Funcion no permitida")

            if len(node.args) != 1 or node.keywords:
                raise ValueError("La funcion requiere un argumento")

            arg = build(node.args[0], depth+1)

            return FUNCTIONS[name](arg, evaluate=False)

        raise ValueError("Construccion no permitida")

    return build(tree.body)


def build_function(expr_str: str, var_name: str = "x"):
    x = sp.Symbol(var_name)

    expr = parse_math_expression(
        expr_str, {var_name: x}
    )

    d1_expr = sp.diff(expr, x)
    d2_expr = sp.diff(d1_expr, x)

    return {
        "f": sp.lambdify(x, expr, modules=["numpy"]),
        "df": sp.lambdify(x, d1_expr, modules=["numpy"]),
        "d2f": sp.lambdify(x, d2_expr, modules=["numpy"]),
        "latex": sp.latex(expr),
        "d1_latex": sp.latex(d1_expr),
        "expr": expr,
    }
