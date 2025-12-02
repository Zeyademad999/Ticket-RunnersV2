# Testing Your NFC Setup

## Quick Test

1. **Start the NFC service:**
   ```bash
   cd nfc-bridge-server
   npm start
   ```

2. **You should see:**
   ```
   🔌 NFC Service - WebSocket Server
   WebSocket Server: ws://localhost:9090
   ✅ NFC Reader connected: ACR122U PICC Interface
   ```

3. **Place a card on the reader** - You should see:
   ```
   🎫 Card Scanned: 04A1B2C3D4E580
      → Sent to 1 client(s)
   ```

4. **Open Admin Dashboard** → NFC Card Management
   - Should show "Reader Ready" (green dot)
   - Card should appear in the table automatically!

## Manual Test (Simple Mode)

If you want to test without hardware:

```bash
cd nfc-bridge-server
npm run start:simple
```

Then type a card UID in the console:
```
NFC-12345-ABCD
```

Press Enter - card will be added!

## Verify Integration

1. ✅ NFC service running on port 9090
2. ✅ Admin dashboard shows "Reader Ready"
3. ✅ "Auto-Add Cards" checkbox is checked
4. ✅ Place card → See notification "Card Auto-Added"
5. ✅ Card appears in NFC Card Management table

## Troubleshooting

### Card not detected
- Make sure ACR122U is plugged in
- Check Windows Device Manager
- Restart NFC service

### Card not auto-adding
- Check browser console (F12)
- Verify WebSocket connection
- Check "Auto-Add Cards" is enabled
- Verify backend is running

### UID format issues
The service automatically converts UIDs to uppercase hex format.
If you see errors, check the console output for the actual UID format.


