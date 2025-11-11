# 📱 How to Test on Your Phone

## The Problem:
- ❌ Desktop Chrome doesn't have AR hardware
- ❌ `http://localhost` doesn't support WebXR
- ✅ **You NEED a phone with HTTPS**

## ✅ EASIEST Solution - Use ngrok:

### Step 1: Keep your server running
```bash
# Your server is already running on localhost:3000
# Keep it running!
```

### Step 2: Install ngrok
Download from: https://ngrok.com/download
- Windows: Download ZIP, extract `ngrok.exe`
- Or install via: `npm install -g ngrok`

### Step 3: Run ngrok
Open a **NEW terminal** (keep the other one running):

```bash
# If you extracted ngrok.exe, navigate to that folder first:
cd C:\path\to\ngrok

# Then run:
ngrok http 3000
```

### Step 4: Get your HTTPS URL
You'll see something like:
```
Forwarding   https://abc123xyz.ngrok.io -> http://localhost:3000
```

### Step 5: Open on your phone
1. Copy the HTTPS URL (e.g., `https://abc123xyz.ngrok.io`)
2. **Open it on your PHONE** (not PC)
3. You should see "✅ AR Ready!"
4. Click "Start AR"
5. Point at a surface
6. Tap to place cubes!

---

## Alternative: Deploy to Internet

### Option A - Netlify (Free, 2 minutes)
1. Go to https://app.netlify.com/drop
2. Drag your entire `VR-Experience` folder
3. Get a URL like `https://your-app.netlify.app`
4. Open on phone!

### Option B - Vercel (Free)
```bash
npm install -g vercel
cd D:\VR-Experience
vercel
```
Follow prompts, get HTTPS URL

### Option C - GitHub Pages
1. Create GitHub repo
2. Push your code
3. Enable Pages in Settings
4. Get URL: `https://username.github.io/repo-name`

---

## 📱 Phone Requirements:

### Android:
- Android 8.0+
- ARCore-compatible device (most phones from 2018+)
- **Chrome browser**
- Check compatibility: https://developers.google.com/ar/devices

### iPhone:
- iPhone 6s or newer
- iOS 14.5+
- **Safari browser**

---

## 🎮 What You'll See on Phone:

1. **Open HTTPS URL** on phone
2. Status: "✅ AR Ready! Click Start AR"
3. Click **"Start AR"** button
4. Grant camera permission
5. See **FULL SCREEN AR VIEW**
6. Move phone around
7. Green ring appears on **FLAT SURFACES**
8. **TAP SCREEN** to place cube
9. Cube sticks to surface!
10. Walk around - cube stays in exact spot!

---

## 🔧 Troubleshooting:

### "WebXR Not Available" on phone
- Make sure you're using **HTTPS** URL (not http)
- Use Chrome (Android) or Safari (iOS)
- Update your browser

### Camera permission denied
- Go to phone Settings → Apps → Chrome/Safari
- Enable Camera permission
- Reload page

### Green ring doesn't appear
- Point at a **flat surface** (table, floor, desk)
- Move phone around slowly
- Make sure room has good lighting
- Surface needs to be textured (not blank white)

### ngrok session expired (after 2 hours)
Free ngrok sessions expire. Just restart:
```bash
# Stop ngrok (Ctrl+C)
# Run again
ngrok http 3000
```
You'll get a new URL

---

## ✅ Success Checklist:

- [ ] Server running on localhost:3000
- [ ] ngrok running and showing HTTPS URL
- [ ] Opened HTTPS URL on phone (not PC!)
- [ ] Using Chrome (Android) or Safari (iOS)
- [ ] Granted camera permission
- [ ] Clicked "Start AR" button
- [ ] In fullscreen AR view
- [ ] Pointing at flat surface
- [ ] Green ring appears on surface
- [ ] Tapped to place cube
- [ ] Cube stays on surface when moving!

---

## 🎉 When It Works:

You'll be able to:
- Place cubes on your **real desk**
- Walk around your room
- Cubes stay **perfectly anchored** to surfaces
- Just like professional AR apps!

This is **REAL AR** - not fake overlay tricks! 🚀
