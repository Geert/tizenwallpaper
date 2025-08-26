# Tizen Wallpaper TV App

## Overview

This project is a simple Samsung TV (Tizen) app that displays a fullscreen web page on your TV. The app loads [https://geert.github.io/pexel-wallpaper/](https://geert.github.io/pexel-wallpaper/), which shows a random nature photo and changes the image every few minutes. The app’s sole purpose is to display this website in fullscreen mode.

## Features

- Fullscreen display of a web page on Samsung Tizen TVs
- Automatically cycles through random nature wallpapers

## Requirements

- Samsung Smart TV with Tizen OS (2015 or later)
- Tizen Studio (for development and packaging)
- Samsung Developer account (for app registration and publishing)

## Setup & Development

1. **Install Tizen Studio:**  
   Download and install Tizen Studio from [Samsung’s official site](https://developer.tizen.org/development/tizen-studio/download).
2. **Create a New Web App Project:**  
   - Select “Web Application” > “Basic Project”.
   - Set the app to load the URL `https://geert.github.io/pexel-wallpaper/` in fullscreen.
3. **Test on Emulator or TV:**  
   - Use the Tizen emulator or sideload to your TV for testing.
4. **Package the App:**  
   - Build and package the app using Tizen Studio.

## Publishing on Samsung TV

1. **Register as a Samsung Developer:**  
   - Sign up at the [Samsung Developer Portal](https://developer.samsung.com/).
2. **App Registration:**  
   - Go to [Samsung Seller Office](https://seller.samsungapps.com/) to register your app.
   - Follow the [TV app submission guide](https://developer.samsung.com/smarttv/develop/getting-started/app-distribution.html).
3. **Certification:**  
   - Request a certificate profile in Tizen Studio for signing your app.
4. **Submit for Review:**  
   - Upload your packaged app, fill in the required information, and submit for Samsung’s review.

## Useful Links

- [Tizen TV Web App Development Guide](https://developer.samsung.com/smarttv/develop/getting-started/overview.html)
- [Samsung Seller Office](https://seller.samsungapps.com/)
- [App Distribution Guide](https://developer.samsung.com/smarttv/develop/getting-started/app-distribution.html)

## Notes

- This app only displays the specified website in fullscreen; no additional features are included.
- For official deployment, follow Samsung’s guidelines for app packaging, certification, and submission.
