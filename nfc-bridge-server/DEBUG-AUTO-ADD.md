# 🐛 Debug Auto-Add Issues

## What to Check When Scanning

### 1. Check NFC Service Console
When you scan a card, you should see:
```
🎫 Card Scanned: [UID]
   → Sent to X client(s)
```

**If you see "Sent to 0 client(s)":**
- The admin dashboard is not connected
- Refresh the admin dashboard page
- Check if WebSocket connection is established

### 2. Check Browser Console (F12)
Open browser DevTools (F12) → Console tab

**You should see:**
```
✅ Connected to NFC WebSocket service
📨 WebSocket SCAN message received: [UID]
   → Notifying 1 auto-scan subscriber(s)
   → Calling auto-scan callback 1
🎫 Card scanned received: [UID]
   Auto-add enabled: true
   Checking if card exists...
   ✅ Card does not exist, proceeding to add...
   📤 Adding card to database...
   ✅ Card successfully added!
```

**If you see errors:**
- Check the error message
- Make sure the backend API is running
- Check network tab for failed API calls

### 3. Check Network Tab
Open DevTools → Network tab

**When scanning, you should see:**
- WebSocket connection to `ws://localhost:9090`
- API call to `/api/admin/nfc-cards/` (POST request)

**If WebSocket is not connected:**
- Check if NFC service is running
- Check if port 9090 is accessible
- Try refreshing the page

### 4. Common Issues

#### Issue: "Reader Disconnected" (Gray dot)
**Solution:**
- Make sure NFC service is running
- Check if ACR122U reader is plugged in
- Restart the NFC service

#### Issue: "Auto Add" checkbox is unchecked
**Solution:**
- Check the "Auto Add" checkbox in the admin dashboard
- It should turn green when enabled

#### Issue: Card scanned but not added
**Check:**
1. Browser console for errors
2. Network tab for failed API calls
3. Backend logs for errors
4. Make sure card doesn't already exist

#### Issue: "Card already exists" error
**This is normal!** The system prevents duplicate cards.

#### Issue: WebSocket not connecting
**Solution:**
1. Make sure NFC service is running: `.\start-nfc-service.bat`
2. Check if port 9090 is in use
3. Check firewall settings
4. Try refreshing the admin dashboard

### 5. Test Steps

1. **Start NFC Service:**
   ```bash
   cd nfc-bridge-server
   .\start-nfc-service.bat
   ```
   Should see: `✅ NFC Reader connected: ACS ACR122 0`

2. **Open Admin Dashboard:**
   - Go to NFC Card Management
   - Check for green "Reader Connected" indicator
   - Check "Auto Add ✓" is enabled (green)

3. **Scan a Card:**
   - Place card on reader
   - Watch NFC service console for: `🎫 Card Scanned: [UID]`
   - Watch browser console for auto-add messages
   - Check if card appears in the list

4. **If Nothing Happens:**
   - Check browser console (F12)
   - Check NFC service console
   - Make sure WebSocket is connected
   - Try refreshing the page

### 6. Manual Test

If auto-add isn't working, you can test manually:

1. In NFC service console, type a test UID and press Enter
2. Check if it appears in admin dashboard
3. This confirms WebSocket is working

### 7. Reset Everything

If nothing works:

1. **Stop NFC Service:** Press Ctrl+C in the service console
2. **Restart NFC Service:** `.\start-nfc-service.bat`
3. **Refresh Admin Dashboard:** Hard refresh (Ctrl+Shift+R)
4. **Check Connection:** Should see green "Reader Connected"
5. **Try Scanning Again**

---

## Still Having Issues?

Share:
1. What you see in NFC service console when scanning
2. What you see in browser console (F12)
3. Any error messages
4. Screenshot of the admin dashboard

