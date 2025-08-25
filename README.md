
# Odyssey Farmer GUI (Ithaca)

- Reads **private keys** from `private.txt` (one per line).
- Modes: **Loop** (random delays) and **Cron-like** (≈ N tx/day with jitter).
- Randomized actions: ETH ping (0 value), **deploy RandomStorage** contract, optional **ERC20.approve/transfer/mint/burn** (best-effort).
- UI log (tx hash, account, status), auto-balance check (low balance highlighted).
- Relaxed animated background + optional background music (`/public/sound.mp3`) with mute toggle.

## Quickstart
```bash
npm i
cp .env.local.example .env.local
echo 0xYOUR_PRIVATE_KEY > private.txt     # add more lines for more accounts
npm run dev
# open http://localhost:3000
```

## ENV
```
NEXT_PUBLIC_ODYSSEY_RPC=https://odyssey.ithaca.xyz
```

## Notes
- Put your music file at `public/sound.mp3`.
- For ERC20 list, paste addresses in the field (space/comma separated). Some methods may revert — it's fine; logged as failed.
- The in-memory worker lives as long as the server is running.

- Button SFX: place a short file at `public/butten.mp3` (also supports button.mp3/click.mp3). Master mute/volume controls all sounds.

- For button sounds add up to five files: `public/butten1.mp3`..`public/butten5.mp3` (also accepts `buttonN.mp3`/`clickN.mp3`). One random sound plays on each click when not muted.

## Bridge Sepolia → Odyssey
Set `SEPOLIA_RPC` (or `NEXT_PUBLIC_SEPOLIA_RPC`) in `.env.local` for stable L1 RPC. L1 Standard Bridge address defaults to `0x9228...42BA`. UI has a one-off bridge button and you can enable auto-bridging as an action in the scheduler.
