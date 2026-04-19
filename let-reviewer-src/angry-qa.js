import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

const angryMessages = [
  "MY EYES ARE BLEEDING!",
  "ARE YOU SERIOUSLY COMMITTING THIS?",
  "I'VE SEEN BETTER CODE WRITTEN BY A TOASTER!",
  "DID YOU EVEN TRY?",
  "THIS IS WHY WE CAN'T HAVE NICE THINGS!",
  "MY GRANDMOTHER WRITES BETTER REACT AND SHE DOESN'T KNOW WHAT A COMPUTER IS!"
];

function getRandomAngryMessage() {
  return angryMessages[Math.floor(Math.random() * angryMessages.length)];
}

let totalViolations = 0;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);
  let hasError = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    let violation = null;

    if (line.includes('console.log')) {
      violation = `CONSOLE.LOG?! Are we debugging in 1995? Remove this trash immediately!`;
    } else if (line.includes('// TODO') || line.includes('//TODO')) {
      violation = `TODO?! More like TO-NEVER-DO! Don't leave your garbage for someone else to clean up!`;
    } else if (line.match(/style=\{\{.*\}\}/)) {
      violation = `INLINE STYLES?! What is this, inline-css-r-us? Use CSS classes you absolute savage!`;
    } else if (line.includes('catch (e)') || line.match(/catch\s*\(\w+\)\s*\{\s*\}/)) {
      violation = `EMPTY CATCH BLOCK?! Just swallowing errors, huh? Ignorance is bliss!`;
    } else if (line.includes('var ')) {
      violation = `VAR?! Are you a time traveler from 2012? Use let or const!`;
    } else if (line.includes('== ') || line.includes(' ==')) {
      if (!line.includes('===')) {
        violation = `LOOSE EQUALITY (==)?! Do you actively enjoy unpredictable bugs?! Use ===!`;
      }
    }

    if (violation) {
      if (!hasError) {
        console.log(`\n🤬 CHECKING FILE: ${fileName} ... ${getRandomAngryMessage()}`);
        hasError = true;
      }
      console.log(`  ❌ [Line ${lineNum}]: ${violation}`);
      console.log(`     > ${line.trim()}`);
      totalViolations++;
    }
  });
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      scanFile(filePath);
    }
  }
}

console.log("==================================================");
console.log("🛑 ANGRY QA AGENT ACTIVATED 🛑");
console.log("Analyzing your so-called 'code'...");
console.log("==================================================");

try {
  walkDir(srcDir);
} catch (error) {
  console.error("I can't even read your files! Everything is broken!", error);
}

console.log("\n==================================================");
if (totalViolations === 0) {
  console.log("Wow. I actually found zero violations. You got lucky today... I'm watching you. 😒");
} else {
  console.log(`🔥 FOUND ${totalViolations} VIOLATIONS! 🔥`);
  console.log("FIX THIS ATROCITY BEFORE I DELETE THE ENTIRE REPOSITORY!");
  process.exit(1);
}
console.log("==================================================\n");
