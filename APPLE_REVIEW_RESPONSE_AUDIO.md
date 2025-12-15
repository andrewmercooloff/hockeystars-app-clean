# Response to Apple App Review - Background Audio Fix

Thank you for your response. I'm glad to hear that the issues with 5.1.1 and 2.3.6 have been resolved.

Regarding Guideline 2.5.4 - Performance - Software Requirements:

I have removed the "audio" setting from the UIBackgroundModes key in the app configuration. The UIBackgroundModes now only includes "remote-notification" for push notifications.

The app does not play any audio content in the background. The sounds used in the app are:
- Push notification sounds (handled by the system, which doesn't require background audio mode)
- In-app sounds for puck speed measurement (only active when the app is in the foreground)

This change has been implemented in the code and is included in the new build I'm submitting for review.

Thank you for your patience.










