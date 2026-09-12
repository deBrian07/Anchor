# Rejoin

Clock + map for a passenger still ashore. The ship leaves. One tap calls the port agent.

There is no iMessage server. `npm run api` is the FastAPI clock/map backend. It does not read iMessage, and it does not text anyone.

If send is ever wired later, it can only reach numbers in `data/allowlist.json` (empty = nobody), and only after that number texts first in the same session.

```
npm install && python3 -m pip install -r server/requirements.txt
export XAI_API_KEY=...    # optional; fixtures work without it
```

Terminal 1: `npm run api`

Terminal 2: `npm run dev`

Open http://127.0.0.1:5173

iMessage simulation (no real texts): http://127.0.0.1:5173/#sim

Text **sample** → **I'm still at the ruins** → **skip** → **call** from the fake phone. A number not on `data/allowlist.json` is blocked. **Try real send** always returns `send disabled`.

Demo: **Use sample planner** → **I'm still at the ruins** → DEMO **Skip to 17:01** → **CALL** `tel:+529878724410`.
