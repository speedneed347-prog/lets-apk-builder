# Let-S APK Builder — Production Frontend

Static frontend for the Step 13 Let-S APK Builder backend.

## Backend
Default API:
`https://lets-apk-builder.onrender.com`

To use another backend, edit `assets/app.js`:
```js
const API_BASE = "https://your-backend.example.com";
```

## Step 13 features
- APK and AAB output selection
- Online / Offline / Hybrid / Native app modes
- Common and authenticated custom modules
- Build queue and live status
- SSE live updates with polling fallback
- Build history and artifact records
- SHA-256 and artifact metadata
- Ownership-aware build/download API usage
- Production health/platform status
- Responsive mobile-first UI
- Site Editor and Code Editor retained

## GitHub Pages
1. Push this folder to your frontend repository.
2. Enable GitHub Pages from the repository.
3. Confirm `assets/app.js` points to the deployed Render backend.
4. Open the GitHub Pages URL.

The frontend never contains Firebase credentials, signing keys, or webhook secrets.
