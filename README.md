# Decode the Deadline

A website version of the REA cipher puzzle. The important change from the
`.py` script version: **the solution grid now lives only on the server.**
The browser is sent the clues and the two given cells (always meant to be
public), but the actual answer never ships in any HTML, JS, or network
response a student can inspect. Every guess is checked server-side and
answered with just `true` or `false`.

## Fixing the leak

A plain static website (HTML/JS with no backend) would have the same
problem as the `.py` file: whatever the browser downloads, a student can
read via "View Source" or dev tools. This version splits the puzzle in
two:

- **`app.py`** (runs on a server, never sent to the browser) holds
  `SOLUTION`, checks guesses, and answers only `{"correct": true/false}`
  or a parity/primality hint -- never a digit.
- **`templates/index.html` + `static/`** (sent to the browser) hold only
  the clues, the two givens, and the UI logic. There's nothing secret in
  here to find.

## Running it locally

```
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000/`.

## Deploying it for real (GitHub + Render, both free)

1. **Push this folder to a GitHub repo.** 
2. **New + → Web Service**, pick the `decode-the-deadline` repo.
3. Fill in:
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Instance type:** Free
4. Click **Create Web Service**. Render builds it and gives you a public
   URL like `decode-the-deadline.onrender.com` -- that's the link you
   share with applicants.
5. From then on, pushing a new commit to GitHub automatically redeploys
   the site.


Edit three things in `app.py`:

1. `SOLUTION` -- the 3x3 grid. Keep every digit 1-9 used exactly once.
2. The diagonal (`SOLUTION[0][0]`, `[1][1]`, `[2][2]`) should decode to
   your real time:
   - 1st diagonal digit = the hour (1-9)
   - 2nd diagonal digit x 5 = the minute (so minutes must land on a
     multiple of 5)
   - 3rd diagonal digit's parity = AM (odd) / PM (even)
3. `CLUES` -- rewrite so they uniquely pin down your new grid. Easiest
   approach: work outward from the diagonal, the way the current clue
   set does (see the accompanying `.tex` writeup for the full worked
   logic).

If the real time doesn't fit the hour / 5-minute-increment scheme (say,
an 11:52 AM release), you'll need a different formula in both `app.py`
(server) and `static/script.js`'s `checkComplete()` (client) -- keep the
two in sync, since the client only decodes the diagonal *after* the
server has confirmed every digit is correct.

## Files

```
app.py              Flask backend -- the only file with the solution
templates/index.html
static/style.css
static/script.js
requirements.txt
Procfile            tells Render/Heroku how to start the app
```
