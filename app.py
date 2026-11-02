"""
Decode the Deadline -- Flask backend.

The solution grid lives ONLY here, server-side. The browser never
receives it in any form: every /api/guess call returns just a boolean,
and /api/hint returns only a parity/primality description of a cell,
never its value. Viewing page source, the JS bundle, or the network
tab reveals clues and givens (which were always meant to be public)
but never the answer itself.

See README.md for how to re-target this at a different release time,
and for deployment instructions (GitHub + Render).
"""

from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ---------------------------------------------------------------------------
# THE PUZZLE
# ---------------------------------------------------------------------------

SIZE = 3

SOLUTION = [
    [7, 3, 5],
    [2, 9, 4],
    [6, 8, 1],
]

# 0-indexed. These two are handed to players for free, same as before.
GIVENS = {(1, 1): 9, (2, 0): 6}

PRIMES = {2, 3, 5, 7}

CLUES = [
    "Every number in the grid is a single digit (1-9).",
    "The top row contains only PRIME numbers.",
    "The top row contains only ODD numbers.",
    "Exactly one number in the middle row is prime, and it sits in the leftmost column.",
    "The bottom row contains no prime numbers at all.",
    "The largest prime in the whole grid sits in the top-left cell.",
    "Within the top row, the smallest value sits in the middle cell.",
    "Every entry on the main diagonal (top-left to bottom-right) is odd.",
    "The bottom-middle cell is exactly double the middle-right cell.",
]


def in_range(r, c):
    return 0 <= r < SIZE and 0 <= c < SIZE


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/puzzle")
def api_puzzle():
    """Everything a player is allowed to know up front."""
    return jsonify(
        {
            "size": SIZE,
            "givens": [{"row": r, "col": c, "value": v} for (r, c), v in GIVENS.items()],
            "clues": CLUES,
        }
    )


@app.route("/api/guess", methods=["POST"])
def api_guess():
    """The only place the solution is ever consulted. Returns true/false, never a value."""
    data = request.get_json(silent=True) or {}
    try:
        r, c, v = int(data.get("row")), int(data.get("col")), int(data.get("value"))
    except (TypeError, ValueError):
        return jsonify({"error": "row, col, and value must be integers"}), 400

    if not in_range(r, c):
        return jsonify({"error": "row/col out of range"}), 400
    if not (1 <= v <= 9):
        return jsonify({"error": "value must be a single digit 1-9"}), 400

    return jsonify({"correct": SOLUTION[r][c] == v})


@app.route("/api/hint")
def api_hint():
    """A deliberately mild spoiler: parity + primality of one cell, never the digit."""
    try:
        r, c = int(request.args.get("row")), int(request.args.get("col"))
    except (TypeError, ValueError):
        return jsonify({"error": "row and col must be integers"}), 400
    if not in_range(r, c):
        return jsonify({"error": "row/col out of range"}), 400

    val = SOLUTION[r][c]
    return jsonify({"odd": val % 2 == 1, "prime": val in PRIMES})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
