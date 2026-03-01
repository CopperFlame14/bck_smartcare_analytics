# AI-Powered Hospital Administrative Analytics Dashboard 🏥📈

A modern, full-stack, real-time web application to help hospital administrators monitor performance, detect operational bottlenecks, and make data-driven decisions using predictive analytics. 

Built with scalability, usability, and a premium UX aesthetic in mind for hackathon-level presentation quality.

## Features ✨
- **Secure Authentication**: Role-based admin access secured by Firebase Auth.
- **Live Interactive Dashboard**: Monitor key metrics like patient counts, average waiting times, bed availability, and hospital efficiency score in real time.
- **Predictive Analytics**: AI-inspired logic to forecast next-day patient loads based on historical capacity data to prevent department overload.
- **Smart Alert System**: Proactive toast notifications when thresholds (extreme wait times or low bed availability) are crossed.
- **Dynamic Charts**: Interactive visualizations using Chart.js to digest data intuitively.
- **Real-Time Database Sync**: Connected to Firebase Firestore to reflect data manipulations immediately across all clients.
- **Modern UI/UX**: Clean layout with responsive design, sidebar navigation, and a dark/light theme toggle.

## Tech Stack 🛠
- **Frontend**: HTML5, Vanilla CSS (Custom Theme Variables + Grid/Flexbox), JavaScript (ESModules)
- **Backend & Database**: Firebase (Firestore DB, Authentication)
- **Data Visualization**: Chart.js

## Quickstart & Setup 🚀

To run this application locally or deploy it, follow these steps:

### 1. Firebase Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** (Email/Password).
4. Enable **Firestore Database** (Start in test mode or secure it for production).
5. Obtain your Firebase config object from Project Settings.
6. Open `scripts/firebase-config.js` and replace the placeholder `firebaseConfig` with your actual credentials.

### 2. Local Development
Simply open `index.html` in your favorite modern web browser, or serve it using a local development server:
```bash
npx serve .
```

### 3. Usage & Testing
- Add a new test user in your Firebase Authentication console.
- Open the application and log in.
- Navigate to the **"Add Patient Data"** tab to simulate incoming patient records.
- Go back to the **"Dashboard"** to see cards, charts, alerts, and predictions update in real time.

## Deployment 🌐
This project is deployment-ready for Firebase Hosting:
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to your account: `firebase login`
3. Initialize hosting: `firebase init hosting`
4. Deploy the site: `firebase deploy`

---
*Built for the Hackathon with ❤️*
