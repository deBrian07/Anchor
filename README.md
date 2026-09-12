# Rejoin

iMessage bot on this Mac. Laptop shows the clock and map. Phone talks only through Messages.

```
npm install && python3 -m pip install -r server/requirements.txt
export REJOIN_PEER=+1YOURIPHONE    # optional; otherwise first inbound pairs
export XAI_API_KEY=...             # optional
npm run api && npm run dev
```

System Settings → Privacy → Full Disk Access → Terminal, then restart the API. From iPhone, text the Apple ID signed into Messages on this Mac: `sample` → `ruins` → `skip`. Replies come back as iMessages. `tel:+529878724410` after miss.

Sailing times are the mock Royal Caribbean feed in `data/cruise.json`.
