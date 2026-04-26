import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, where, writeBatch, increment, orderBy, limit as firestoreLimit } from "firebase/firestore";
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

// ATTEMPT HISTORY
export async function saveAttempt(uid, attemptData) {
  const attemptsRef = collection(db, "users", uid, "attempts");
  await addDoc(attemptsRef, {
    ...attemptData,
    createdAt: new Date().toISOString()
  });
}

export async function getAttemptHistory(uid) {
  const attemptsRef = collection(db, "users", uid, "attempts");
  const q = query(attemptsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const attempts = [];
  snapshot.forEach(doc => attempts.push({ id: doc.id, ...doc.data() }));
  return attempts;
}

// QUESTION REPORTS
export async function reportQuestion(questionId, uid, reason) {
  const reportsRef = collection(db, "reports");
  await addDoc(reportsRef, {
    questionId,
    reportedBy: uid,
    reason,
    createdAt: new Date().toISOString(),
    status: 'pending'
  });
}

// LEADERBOARD
// Submit or update a leaderboard entry (keeps best score only)
export async function submitLeaderboardEntry(uid, nickname, xp, mode, score, timeSpentSeconds, totalQuestions, correctAnswers, cluster = '') {
  const today = new Date().toISOString().split('T')[0];
  const clusterSlug = cluster ? `_${cluster.replace(/[^a-zA-Z]/g, '')}` : '';
  
  // For daily challenge, key by date so each day has its own leaderboard
  // For category modes (survival, short, hard, sandbox), include cluster in key
  let docId;
  if (mode === 'daily') {
    docId = `${mode}_${today}_${uid}`;
  } else if (mode === 'mock') {
    docId = `${mode}_${uid}`;
  } else {
    // survival, short, hard, sandbox — per cluster per user
    docId = `${mode}${clusterSlug}_${uid}`;
  }
  
  const entryRef = doc(db, "leaderboard", docId);
  const existing = await getDoc(entryRef);
  
  // For daily: only one attempt allowed (never overwrite)
  if (mode === 'daily' && existing.exists()) {
    return; // Already completed today's daily
  }
  
  // For other modes: only update if this is a better score (or first entry)
  if (!existing.exists() || score > existing.data().score || 
      (score === existing.data().score && timeSpentSeconds < existing.data().timeSpentSeconds)) {
    await setDoc(entryRef, {
      uid,
      nickname: nickname || 'Anonymous',
      xp: xp || 0,
      mode,
      cluster: cluster || '',
      score,
      timeSpentSeconds,
      totalQuestions,
      correctAnswers,
      date: today,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

// Check if user has already completed today's daily challenge
export async function hasDoneDailyChallenge(uid) {
  const today = new Date().toISOString().split('T')[0];
  const docId = `daily_${today}_${uid}`;
  const entryRef = doc(db, "leaderboard", docId);
  const snap = await getDoc(entryRef);
  if (snap.exists()) {
    return snap.data(); // Return their result
  }
  return null;
}

// Get leaderboard entries for a specific mode, optionally filtered by date and cluster
// Uses simple single-field query + client-side sort to avoid composite index requirement
export async function getLeaderboard(mode, limitAmount = 10, todayOnly = false, cluster = '') {
  const q = query(
    collection(db, "leaderboard"),
    where("mode", "==", mode)
  );
  
  const snapshot = await getDocs(q);
  let entries = [];
  snapshot.forEach(d => entries.push({ id: d.id, ...d.data() }));
  
  // Client-side date filtering
  if (todayOnly) {
    const today = new Date().toISOString().split('T')[0];
    entries = entries.filter(e => e.date === today);
  }
  
  // Client-side cluster filtering
  if (cluster) {
    entries = entries.filter(e => e.cluster === cluster);
  }
  
  // Client-side sort:
  // 1st: score % (higher is better)
  // 2nd: time elapsed (lower/faster is better)
  // 3rd: submission time (earlier is better — who answered first)
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((a.timeSpentSeconds || 0) !== (b.timeSpentSeconds || 0)) {
      return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
    }
    return (a.submittedAt || '').localeCompare(b.submittedAt || '');
  });
  
  return entries.slice(0, limitAmount);
}

// Get top users by XP (overall leaderboard)
export async function getXPLeaderboard(limitAmount = 10) {
  const q = query(
    collection(db, "users"),
    orderBy("xp", "desc"),
    firestoreLimit(limitAmount)
  );
  const snapshot = await getDocs(q);
  const entries = [];
  snapshot.forEach(d => entries.push({ id: d.id, ...d.data() }));
  return entries;
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

  // Group questions by cluster
  const clusters = {};
  allQs.forEach(q => {
    const cluster = q.cluster || 'General';
    if (!clusters[cluster]) clusters[cluster] = [];
    clusters[cluster].push(q);
  });

  // Seeded shuffle each cluster independently
  Object.values(clusters).forEach(arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  });

  // Distribute evenly: round-robin from each cluster
  const clusterKeys = Object.keys(clusters);
  // Shuffle cluster order with seed too so it's not always alphabetical
  for (let i = clusterKeys.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [clusterKeys[i], clusterKeys[j]] = [clusterKeys[j], clusterKeys[i]];
  }

  const perCluster = Math.floor(limit / clusterKeys.length);
  const remainder = limit % clusterKeys.length;

  const selected = [];
  const usedIds = new Set();

  // Take perCluster from each, +1 for the first 'remainder' clusters
  clusterKeys.forEach((key, idx) => {
    const take = perCluster + (idx < remainder ? 1 : 0);
    const pool = clusters[key];
    for (let i = 0; i < Math.min(take, pool.length); i++) {
      selected.push(pool[i]);
      usedIds.add(pool[i].id);
    }
  });

  // If any cluster didn't have enough, fill from remaining questions across all clusters
  if (selected.length < limit) {
    const leftover = allQs.filter(q => !usedIds.has(q.id));
    // Seeded shuffle the leftover
    for (let i = leftover.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [leftover[i], leftover[j]] = [leftover[j], leftover[i]];
    }
    for (const q of leftover) {
      if (selected.length >= limit) break;
      selected.push(q);
    }
  }

  // Final seeded shuffle so questions aren't grouped by cluster
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected.slice(0, limit);
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

// RAFFLE POINTS
export async function getUserRafflePoints(uid) {
  let points = 0;
  
  try {
    // 1. Overall XP Top 10
    const xpLb = await getXPLeaderboard(10);
    if (xpLb.some(e => e.uid === uid)) points += 1;
    
    // 2. Mock Exam Top 10
    const mockLb = await getLeaderboard('mock', 10, false, '');
    if (mockLb.some(e => e.uid === uid)) points += 1;
    
    // 3. Modes + Clusters Top 10
    const modes = ['survival', 'short', 'hard', 'sandbox'];
    const clusters = ['Intellectual Competencies', 'Personal & Civic Responsibilities', 'Practical Skills Development'];
    
    // Since getLeaderboard requires mode and cluster, we can do these in parallel
    const promises = [];
    for (const mode of modes) {
      for (const cluster of clusters) {
        promises.push(getLeaderboard(mode, 10, false, cluster));
      }
    }
    const allLbs = await Promise.all(promises);
    for (const lb of allLbs) {
      if (lb.some(e => e.uid === uid)) points += 1;
    }
    
    // 4. Daily Leaderboards
    const qDaily = query(collection(db, "leaderboard"), where("uid", "==", uid), where("mode", "==", "daily"));
    const dailySnap = await getDocs(qDaily);
    const dailyDates = [];
    dailySnap.forEach(d => dailyDates.push(d.data().date));
    
    for (const date of dailyDates) {
      const qDay = query(collection(db, "leaderboard"), where("mode", "==", "daily"), where("date", "==", date));
      const daySnap = await getDocs(qDay);
      const dayEntries = [];
      daySnap.forEach(d => dayEntries.push(d.data()));
      
      dayEntries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((a.timeSpentSeconds || 0) !== (b.timeSpentSeconds || 0)) {
          return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
        }
        return (a.submittedAt || '').localeCompare(b.submittedAt || '');
      });
      
      const rank = dayEntries.findIndex(e => e.uid === uid);
      if (rank !== -1) {
        if (rank < 10) points += 1; // 1 point for being in top 10 daily leaderboard
        if (rank < 3) points += 1;  // +1 permanent for top 3
      }
    }
  } catch (err) {
    console.error("Error calculating raffle points:", err);
  }
  
  return points;
}
