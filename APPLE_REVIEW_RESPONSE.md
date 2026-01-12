# Response to Apple App Review

## Submission ID: 9f0cf029-9f30-47d2-be68-63549b76ebd7

Thank you for your review. I've fixed all the issues you mentioned. Here are my responses:

---

### Guideline 5.1.1 - Legal - Privacy - Data Collection and Storage

**Issue:** Photo library purpose string does not sufficiently explain the use of protected resources.

**Response:** I've updated the purpose strings to be more specific about how the app uses photo library access. Here's what I added:

- **NSPhotoLibraryUsageDescription:** "This app needs access to your photo library to upload profile photos, team photos, and achievement photos. For example, you can select a photo from your library to set as your profile picture or add photos to your achievements gallery."

- **NSPhotoLibraryAddUsageDescription:** "This app needs permission to save photos to your library. For example, you can save achievement photos or team photos to your device's photo library."

I also improved the other purpose strings to include specific examples:
- **NSMicrophoneUsageDescription:** Now explains that the microphone is used to measure puck speed by detecting when a puck hits the net, with an example of how it works.
- **NSCameraUsageDescription:** Now explains that the camera tracks puck movement to calculate speed, with a specific example.
- **NSLocationWhenInUseUsageDescription:** Clarified that location services aren't directly used by the app, but third-party libraries might request it.

I've also updated my Privacy Policy on the website (https://hockey-stars.com/privacy-en.html) to include detailed information about Photo Library usage. The policy was updated on December 4, 2025.

---

### Guideline 2.3.6 - Performance - Accurate Metadata

**Issue:** Age Rating indicates "In-App Controls" but Parental Controls or Age Assurance mechanisms were not found.

**Response:** Parental controls are implemented for users under 13. They work through email verification (Email-Plus method, which meets COPPA requirements). Here's where to find them:

When a user under 13 tries to register as a "player" or "star", the app automatically shows a field for the parent's email address. The app calculates age from the birth date and requires this field if the user is under 13.

The process works like this:
- The parent gets an email with a verification link
- The email explains what data is collected and includes privacy policy information
- The parent needs to click the link and confirm on my website (https://hockey-stars.com/verify-consent.html)
- The child's account only gets activated after the parent confirms
- Without parent confirmation, registration can't be completed

The privacy policy link is shown in the registration form at the bottom.

The system is built in the registration screen (checks age and shows parent email field), and the backend sends verification emails and processes the consent. The privacy policy on my website has a section "6.1. Parental Consent for Children Under 13" that explains this in detail.

---

### Guideline 2.5.4 - Performance - Software Requirements

**Issue:** App declares support for audio in UIBackgroundModes but no audible content plays in background.

**Response:** I've removed the "audio" mode from UIBackgroundModes. The app only uses sounds for push notifications, which don't need background audio mode. Now UIBackgroundModes only has "remote-notification" for push notifications.

The app does use sounds for measuring puck speed when it's open (using the microphone), but that only works when the app is in the foreground, so it doesn't need background audio mode.

---

### Guideline 5.1.1(v) - Data Collection and Storage

**Issue:** App supports account creation but does not include an option to initiate account deletion.

**Response:** Account deletion is already in the app. Here's how to find it:

Go to any user profile, tap the three-dot menu in the top right corner, and select "Delete Account" (or "Удалить аккаунт" in Russian).

When the user taps delete, they see a warning that says all their data will be permanently deleted and can't be recovered, and that the action can't be undone. This message appears in all 12 languages the app supports. The user has to confirm to proceed.

After confirmation, everything gets deleted from the database - profile, messages, friend requests, notifications, photos, videos, exercise stats, achievements, everything. Then the user is automatically logged out.

The deletion function is in the profile screen code, and it calls a database function that removes all the user's data.

I've also updated the Privacy Policy on my website to add a section "5.1. Account Deletion" that explains the process step by step, what gets deleted, and that it can't be undone. The policy was updated on December 4, 2025.

I've also improved the warning message in all 12 languages to make it very clear that deletion is permanent.

---

## Summary

I've made the following changes:

1. Updated all purpose strings with specific examples of how each permission is used
2. Removed "audio" from UIBackgroundModes (only "remote-notification" remains)
3. Improved the account deletion warning in all 12 languages to clearly state that deletion is permanent
4. Updated the Privacy Policy on the website with details about Photo Library usage and Account Deletion
5. Confirmed that parental controls are implemented for users under 13 via email verification

All changes are in the code and will be in the next build. The Privacy Policy is updated on the website at the URL I have in App Store Connect.















































