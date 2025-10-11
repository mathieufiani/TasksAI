# iOS Deployment Guide - TasksAI

This guide will walk you through deploying the TasksAI app to your iPhone.

## Prerequisites

- macOS with Xcode installed
- Apple ID (free or paid developer account)
- iPhone with USB cable
- CocoaPods installed

## Step 1: Install iOS Dependencies

```bash
cd ios
bundle install      # Install Ruby dependencies (if not already done)
bundle exec pod install
cd ..
```

## Step 2: Configure Xcode Project

1. Open the project in Xcode:
   ```bash
   open ios/MyApp.xcworkspace
   ```

2. In Xcode, select the "MyApp" project in the navigator

3. Select the "MyApp" target

4. Go to "Signing & Capabilities" tab

5. **Change Bundle Identifier**:
   - Change from: `org.reactjs.native.example.MyApp`
   - Change to: `com.yourname.TasksAI` (e.g., `com.mathieu.TasksAI`)
   - Make it unique to avoid conflicts

6. **Enable Automatic Signing**:
   - Check "Automatically manage signing"
   - Select your Team (your Apple ID)
   - Xcode will handle provisioning profiles automatically

7. **Update Display Name**:
   - Go to "General" tab
   - Change "Display Name" to "TasksAI"

8. **Set Version**:
   - Version: 1.0.0
   - Build: 1

## Step 3: Connect Your iPhone

1. Connect your iPhone to your Mac via USB cable

2. **Trust This Computer**:
   - On your iPhone, you'll see "Trust This Computer?"
   - Tap "Trust" and enter your passcode

3. **Enable Developer Mode** (iOS 16+):
   - On your iPhone: Settings → Privacy & Security → Developer Mode
   - Toggle it ON and restart your iPhone

## Step 4: Build and Deploy

### Option A: Using Xcode (Recommended for First Time)

1. In Xcode, at the top, select your iPhone from the device dropdown

2. Click the "Play" button (▶️) or press Cmd+R

3. Xcode will:
   - Build the app
   - Install it on your iPhone
   - Launch it automatically

4. **First Time**: You'll need to trust the developer certificate on your iPhone:
   - Go to: Settings → General → VPN & Device Management
   - Tap on your Apple ID
   - Tap "Trust [Your Apple ID]"

5. Go back to your home screen and launch TasksAI!

### Option B: Using Command Line

```bash
# Build and run on connected iOS device
npm run ios -- --device="Your iPhone Name"

# Or use React Native CLI directly
npx react-native run-ios --device="Your iPhone Name"
```

## Step 5: Build Release Version

For a production build (smaller size, better performance):

1. In Xcode, select the scheme dropdown (next to device)

2. Select "Edit Scheme..."

3. Select "Run" on the left

4. Change "Build Configuration" from "Debug" to "Release"

5. Click "Close"

6. Build and run (Cmd+R)

## API Configuration

The app is configured to use:
- **Development**: Local backend at `http://192.168.3.142:8000`
- **Production**: Google App Engine at `https://staging-543b455bc34613c8a8688306b92bbc64bdba19c3-dot-tasksai-474818.appspot.com`

When built in Release mode, the app automatically uses the production backend.

## Troubleshooting

### Error: "No profiles for..."
- Make sure you're signed in with your Apple ID in Xcode
- Go to Xcode → Settings → Accounts → Add your Apple ID

### Error: "A valid provisioning profile..."
- Try changing the Bundle Identifier to something unique
- Make sure "Automatically manage signing" is checked

### App crashes on launch
- Check that the backend is running and accessible
- Check Xcode console for error logs

### "Untrusted Developer"
- Settings → General → VPN & Device Management
- Trust your developer certificate

## Next Steps

Once the app is running on your phone:
1. Test all features (task creation, AI labeling, recommendations)
2. Ensure it connects to the backend properly
3. Test offline behavior
4. Check performance and battery usage

## Backend URLs

- **Staging**: https://staging-543b455bc34613c8a8688306b92bbc64bdba19c3-dot-tasksai-474818.appspot.com
- **Production** (future): Will be deployed to `https://tasksai-474818.appspot.com`

## App Store Deployment (Future)

To deploy to the App Store, you'll need:
1. Paid Apple Developer Account ($99/year)
2. App Store Connect setup
3. Screenshots and app description
4. Privacy policy and terms of service
5. TestFlight beta testing (optional but recommended)

For now, you can use the app directly on your device!
