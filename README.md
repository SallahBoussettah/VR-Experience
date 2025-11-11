# 🎮 AR Hand-Tracking Cube Builder

Professional AR experience using WebXR for realistic surface detection and anchoring.

## ✅ What You Built

- **True AR** using WebXR (same tech as Snapchat, Instagram filters)
- **Real plane detection** - finds actual surfaces (tables, floors, walls)
- **AR anchors** - cubes stick perfectly to real-world positions
- **Hand tracking** (optional) - pinch and fist gestures
- **Grid snapping** - organized cube placement

## 📱 Requirements

### Device:
- **Android**: Chrome browser + ARCore-compatible device
- **iPhone**: Safari (iOS 14.5+) + iPhone 6s or newer

### Connection:
- **HTTPS** (secure connection) OR
- **localhost** (for local testing)

## 🚀 How to Run

### Option 1: Simple Local Server (HTTPS)

```bash
# Install http-server with SSL
npm install -g http-server

# Run with SSL (creates self-signed cert)
http-server -S -C cert.pem -K key.pem -p 8080
```

Then open: `https://localhost:8080`

**Note:** You'll see a security warning (self-signed cert) - click "Advanced" → "Proceed anyway"

### Option 2: Using Python (HTTP only - won't work for WebXR)

```bash
# Python 3
python -m http.server 8000
```

Open: `http://localhost:8000` (won't have WebXR support)

### Option 3: Deploy to HTTPS Server

Deploy to any of these free HTTPS hosts:
- **Netlify** - drag & drop your folder
- **Vercel** - `vercel deploy`
- **GitHub Pages** - enable in repo settings
- **Cloudflare Pages** - connect your repo

### Option 4: ngrok (Easiest for Testing on Phone)

```bash
# Install ngrok from https://ngrok.com

# Run local server first
npx serve .

# In another terminal, tunnel it
ngrok http 3000
```

You'll get an HTTPS URL like `https://abc123.ngrok.io` - open this on your phone!

## 🎯 How to Use

1. **Open the app** on your phone with HTTPS
2. Click **"Start AR"** button
3. **Grant camera permissions**
4. **Point at a flat surface** (desk, table, floor)
   - You'll see a green ring when surface is detected
5. **Tap screen** to place a cube
6. **Walk around** - cubes stay perfectly anchored!

### Controls:
- **Tap**: Place cube on detected surface
- **Grid Snap Toggle**: Enable/disable grid snapping
- **Clear All**: Remove all cubes

## 🔧 Troubleshooting

### "Checking for AR..." stuck

**Cause**: No HTTPS or browser doesn't support WebXR

**Fix**:
1. Use HTTPS (see options above)
2. Test on phone, not desktop
3. Use Chrome (Android) or Safari (iOS)

### "WebXR Not Available"

**Cause**: Wrong browser or device

**Fix**:
- Android: Use Chrome browser
- iPhone: Use Safari browser
- Make sure device is AR-capable

### Three.js failed to load

**Cause**: CDN issue or no internet

**Fix**:
- Check internet connection
- Try refreshing page

### Opens browser console and check logs

Press F12 (desktop) or use remote debugging for phone

## 🎨 Features

### Implemented:
- ✅ WebXR AR session
- ✅ Real surface detection (hit testing)
- ✅ AR anchors (cubes stick to surfaces)
- ✅ Grid snapping
- ✅ Tap to place
- ✅ Clear all cubes
- ✅ Hand tracking (MediaPipe)

### How It Works:
1. **WebXR** starts AR camera session
2. **Hit Testing** scans for flat surfaces
3. **Green reticle** shows detected surface
4. **Tap** creates cube at that exact position
5. **AR Anchor** locks cube to real-world coordinates
6. **As you move**, anchors keep cubes in perfect position

## 📊 Browser Support

| Browser | Android | iOS | Desktop |
|---------|---------|-----|---------|
| Chrome | ✅ Yes | ❌ No | ❌ No* |
| Safari | ❌ No | ✅ Yes | ❌ No* |
| Firefox | ❌ No | ❌ No | ❌ No |
| Edge | ✅ Yes | ❌ No | ❌ No* |

*Desktop browsers don't have AR hardware

## 🌟 Why This Is Professional AR

Unlike "fake AR" that just overlays objects, this uses:

**WebXR Hit Testing**
- Sends rays into real world
- Detects actual surfaces
- Returns 3D position in real space

**AR Anchors**
- Creates persistent points in physical space
- Tracked by device's AR system (ARCore/ARKit)
- Updates every frame as you move

**Result**: Cubes behave like real objects stuck to surfaces!

## 📝 Next Steps

Want to add more features?
- ✅ Color picker for cubes
- ✅ Save/load cube layouts
- ✅ Rotate cubes with gestures
- ✅ Different shapes (spheres, pyramids)
- ✅ Multiplayer (share AR sessions)
- ✅ Occlusion (hide cubes behind real objects)

## 🆘 Still Having Issues?

1. **Open browser console** (F12)
2. Look for error messages
3. Share the console output

Common issues:
- Not using HTTPS → Won't work
- Desktop browser → Needs phone with AR
- Old phone → Needs ARCore/ARKit support

## 🎉 Success!

When working correctly, you should:
1. See "✅ AR Ready!" message
2. Click "Start AR" → enters fullscreen AR
3. See camera feed
4. Move phone to see green ring on surfaces
5. Tap to place cubes
6. Walk around → cubes stay perfectly in place!

Enjoy building in AR! 🚀
