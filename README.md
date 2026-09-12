# Rejoin

iMessage bot on your Mac. Phone texts it. Clock + map on the laptop. Ship leaves. One tap calls the port agent.

```
npm install && python3 -m pip install -r server/requirements.txt
export REJOIN_PEER=+1YOURPHONE     # iPhone iMessage you will text from
export XAI_API_KEY=...             # optional
npm run api && npm run dev         # two terminals; API must bind 0.0.0.0
```

Phone: open the LAN URL on the banner (same Wi‑Fi), or text the Mac's Apple ID after granting Terminal **Full Disk Access** (System Settings → Privacy). Say `sample`, then `ruins`, then `skip`.

Demo on the laptop: **Use sample planner** → ruins → DEMO **Skip to 17:01** → **CALL** `tel:+529878724410`.

Sailing times are a mock Royal Caribbean feed in `data/cruise.json`. No key / no Wi‑Fi still runs from fixtures.
