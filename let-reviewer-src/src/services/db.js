import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, writeBatch, increment, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { db } from "../firebase";

// USER PROFILES
export async function getUserProfile(uid, email, displayName) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    const newUser = {
      uid,
      email,
      name: displayName,
      nickname: null,
      major: null, // "BEED" or "BSED"
      streak: 0,
      xp: 0,
      createdAt: new Date().toISOString(),
      analytics: {
        totalLogins: 1,
        totalQuizzesCompleted: 0,
        totalQuestionsAnswered: 0,
        totalTimeSpentSeconds: 0,
        lastActiveDate: new Date().toISOString()
      }
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
}

export async function updateUserMajor(uid, major) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { major });
}

export async function updateUserNickname(uid, nickname) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { nickname });
}

export async function updateUserXP(uid, xpToAdd) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const currentXp = userSnap.data().xp || 0;
    const newXp = currentXp + xpToAdd;
    await updateDoc(userRef, { xp: newXp });
    return newXp;
  }
  return 0;
}

export async function recordUserActivity(uid, questionsAnswered, timeSpentSeconds) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  
  const data = userSnap.data();
  const analytics = data.analytics || {
    totalLogins: 1, totalQuizzesCompleted: 0, totalQuestionsAnswered: 0, totalTimeSpentSeconds: 0, lastActiveDate: null
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let newStreak = data.streak || 0;
  
  if (analytics.lastActiveDate) {
    const lastDate = new Date(analytics.lastActiveDate);
    const lastActiveDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffTime = Math.abs(today - lastActiveDay);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1; // First active day
  }

  analytics.totalQuizzesCompleted += 1;
  analytics.totalQuestionsAnswered += questionsAnswered;
  analytics.totalTimeSpentSeconds += timeSpentSeconds;
  analytics.lastActiveDate = now.toISOString();

  await updateDoc(userRef, { 
    streak: newStreak,
    analytics 
  });
  
  return newStreak;
}

export async function recordLogin(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  const data = userSnap.data();
  const analytics = data.analytics || { totalLogins: 0, lastActiveDate: null };
  analytics.totalLogins += 1;
  await updateDoc(userRef, { analytics });
}

// QUESTIONS
export async function getQuestionsByCluster(cluster) {
  const q = query(collection(db, "questions"), where("cluster", "==", cluster));
  const querySnapshot = await getDocs(q);
  const questions = [];
  querySnapshot.forEach((doc) => {
    questions.push({ id: doc.id, ...doc.data() });
  });
  return questions;
}

export async function getEndlessQuestions(cluster) {
  // Same as getQuestionsByCluster, but expected to be deeply randomized by the caller
  const questions = await getQuestionsByCluster(cluster);
  return questions.sort(() => Math.random() - 0.5);
}

export async function getHardestQuestions(cluster, limitAmount = 20) {
  const questions = await getQuestionsByCluster(cluster);
  // Calculate accuracy: timesCorrectFirstTry / timesAttempted
  const withAccuracy = questions.filter(q => q.timesAttempted > 0).map(q => ({
    ...q,
    accuracy: q.timesCorrectFirstTry / q.timesAttempted
  }));
  
  // Sort by lowest accuracy
  withAccuracy.sort((a, b) => a.accuracy - b.accuracy);
  
  return withAccuracy.slice(0, limitAmount);
}

export async function recordQuestionStats(answersMap, questionsArray) {
  const batch = writeBatch(db);
  for (const q of questionsArray) {
    if (!answersMap[q.id]) continue; // Skip if user didn't answer it
    const isCorrect = answersMap[q.id] === q.correctAnswer;
    const qRef = doc(db, "questions", q.id);
    batch.update(qRef, {
      timesAttempted: increment(1),
      timesCorrectFirstTry: isCorrect ? increment(1) : increment(0)
    });
  }
  await batch.commit();
}

const QUOTAS_150 = {
  'Intellectual Competencies': { Remember: 7, Understand: 9, Apply: 30, Analyze: 6, Evaluate: 4, Create: 4 },
  'Personal & Civic Responsibilities': { Remember: 7, Understand: 7, Apply: 22, Analyze: 5, Evaluate: 2, Create: 2 },
  'Practical Skills Development': { Remember: 8, Understand: 7, Apply: 23, Analyze: 4, Evaluate: 2, Create: 1 }
};

const QUOTAS_75 = {
  'Intellectual Competencies': { Remember: 4, Understand: 4, Apply: 15, Analyze: 3, Evaluate: 2, Create: 2 },
  'Personal & Civic Responsibilities': { Remember: 4, Understand: 3, Apply: 11, Analyze: 3, Evaluate: 1, Create: 1 },
  'Practical Skills Development': { Remember: 4, Understand: 4, Apply: 11, Analyze: 2, Evaluate: 1, Create: 0 }
};

export async function generateMockExam(itemCount = 150) {
  const q = query(collection(db, "questions"));
  const querySnapshot = await getDocs(q);
  const allQs = [];
  querySnapshot.forEach(doc => allQs.push({ id: doc.id, ...doc.data() }));

  allQs.sort(() => Math.random() - 0.5);

  const targetQuotas = itemCount === 75 ? QUOTAS_75 : QUOTAS_150;

  const selected = [];
  const unselected = [];

  const pickedCounts = {
    'Intellectual Competencies': { Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0 },
    'Personal & Civic Responsibilities': { Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0 },
    'Practical Skills Development': { Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0 }
  };

  for (let question of allQs) {
    const cluster = question.cluster || question.subject;
    if (!targetQuotas[cluster]) {
      unselected.push(question);
      continue;
    }

    let bloom = question.bloomsLevel ? question.bloomsLevel.trim().toLowerCase() : "apply";
    bloom = bloom.charAt(0).toUpperCase() + bloom.slice(1);
    if (!['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].includes(bloom)) {
      bloom = "Apply";
    }

    if (pickedCounts[cluster][bloom] < targetQuotas[cluster][bloom]) {
      selected.push(question);
      pickedCounts[cluster][bloom]++;
    } else {
      unselected.push(question);
    }
  }

  // Fill gaps if database doesn't have exact TOS distribution
  while (selected.length < itemCount && unselected.length > 0) {
    selected.push(unselected.pop());
  }

  return selected.sort(() => Math.random() - 0.5);
}

// PRNG for global seeded daily challenge
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getDailySeed() {
  const dateStr = new Date().toISOString().split('T')[0]; // e.g. "2026-04-19"
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export async function getDailyChallengeQuestions(limit = 7) {
  const q = query(collection(db, "questions"));
  const querySnapshot = await getDocs(q);
  const allQs = [];
  querySnapshot.forEach(doc => allQs.push({ id: doc.id, ...doc.data() }));

  const seed = getDailySeed();
  const random = mulberry32(seed);

  // Seeded shuffle algorithm (Fisher-Yates)
  for (let i = allQs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [allQs[i], allQs[j]] = [allQs[j], allQs[i]];
  }

  return allQs.slice(0, limit);
}

// SEEDING UTILITY
export async function seedQuestionsFromCSVText(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const batch = writeBatch(db);
  const questionsRef = collection(db, "questions");

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let currentVal = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' && line[j+1] === '"') {
        currentVal += '"';
        j++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal);

    if (values.length < 8) continue;

    // Based on user's CSV format: Number, Subject, Bloom, Question, Choice A, Choice B, Choice C, Choice D, Answer, Explanation
    const [number, subject, bloom, question_text, choice_a, choice_b, choice_c, choice_d, answer, explanation] = values;

    // Calculate relative difficulty based on Bloom's level
    const bloomsMap = {
      'remember': 1, 'understand': 2, 'apply': 3, 'analyze': 4, 'evaluate': 5, 'create': 5
    };
    const difficulty = bloomsMap[bloom?.trim().toLowerCase()] || 3;

    const docRef = doc(questionsRef);
    batch.set(docRef, {
      cluster: subject?.trim(), // The app queries by 'cluster', but the CSV calls it 'Subject'
      subject: subject?.trim(),
      questionText: question_text?.trim(),
      choices: {
        A: choice_a?.trim(),
        B: choice_b?.trim(),
        C: choice_c?.trim(),
        D: choice_d?.trim()
      },
      correctAnswer: answer?.trim().toUpperCase(),
      explanation: explanation?.trim() || "",
      bloomsLevel: bloom?.trim() || "Apply",
      relativeDifficulty: difficulty,
      timesAttempted: 0,
      timesCorrectFirstTry: 0
    });
    count++;
  }

  await batch.commit();
  return count;
}
