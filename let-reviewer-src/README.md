# LET Reviewer App

![LET Reviewer App](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-19.2-blue)
![Firebase](https://img.shields.io/badge/Firebase-12.12-orange)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)

The **LET Reviewer App** is a gamified, modern web application designed specifically to help aspiring teachers prepare for the Licensure Examination for Teachers (LET). 

Combining a nostalgic physical test-taking aesthetic with modern gamification and competitive features, the app makes studying engaging, rigorous, and highly rewarding.

## 🎨 Design & Aesthetic

The app features a unique **"Paper and Pen" aesthetic**:
- **Classic Feel:** Warm paper backgrounds, classic serif typography, and a distraction-free layout to mimic a physical examination environment.
- **Bubble Sheets:** Answer choices are presented in a bubble-sheet style, replicating the exact feel of shading answers during the actual board exam.
- **Teacher's Feedback:** Visual feedback mimics a "teacher's red pen," providing an authentic grading experience.

## 🚀 Core Features

### 1. Gamified Progression System
- **Experience Points (XP) & Levels:** Users earn XP for every question answered correctly. Accumulating XP increases the user's level, providing a tangible sense of progression.
- **Daily Streaks:** Maintaining a daily login and review habit increases a user's streak, encouraging consistent study sessions.

### 2. Comprehensive Study Modes
To cater to different review strategies and time constraints, the app offers multiple game modes:
- **Practice Mode:** A standard, stress-free review session.
- **Short Mode:** A quick 7-question challenge with a strict 3-minute time limit.
- **Hard Mode:** A full 20-question challenge featuring the most difficult questions.
- **Survival Mode:** A high-stakes mode where incorrect answers cost "lives." The game ends when all lives are lost.
- **Sandbox Mode:** An endless freestyle mode for deep, continuous study.

### 3. Review Categories
Questions are meticulously categorized to cover core LET competencies:
- 🧠 **Intellectual Competencies**
- 🏛️ **Personal & Civic Responsibilities**
- 🛠️ **Practical Skills Development**
- 📚 **Professional Education**

### 4. Daily Challenges & Competitive Leaderboards
- **Global Daily Challenge:** A 7-question speedrun that is identical for every user on a given day. Features a specialized "Top 3" daily leaderboard.
- **Mock Exams:** Fully customizable mock exams with variable question limits and an all-time top 3 leaderboard.
- **Global Leaderboards:** Track your rank against other reviewers across different game modes and categories.

### 5. Performance Tracking & Analytics
- **Attempt History:** Users can look back at their previous quiz attempts, review their scores, and identify weak points to improve upon.

## 🛠️ Technology Stack

- **Frontend:** React 19, React Router, Vite
- **Styling:** Vanilla CSS tailored for the custom "Paper and Pen" theme
- **Backend & Database:** Firebase Authentication (Google/Email) and Firestore Database
- **Hosting:** GitHub Pages (via `gh-pages`)
- **PWA Ready:** Built with `vite-plugin-pwa` to allow users to install the app on their devices for seamless, cross-device progress tracking and offline resilience.

## 📦 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate into the project directory:
   ```bash
   cd let-reviewer-src
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Set up your Firebase environment variables. Create a `.env` file in the root directory based on your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### Running the App
Start the development server with Vite:
```bash
npm run dev
```

### Deployment
To build and deploy the app to GitHub Pages:
```bash
npm run deploy
```

## 📝 License
This project is private and intended for LET review purposes.
