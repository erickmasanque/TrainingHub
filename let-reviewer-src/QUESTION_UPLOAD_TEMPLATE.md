# LET Reviewer — Question CSV Template

> Paste this whole file into a Claude chat, then fill in **My Request** at the bottom.
> Claude will reply with a CSV you can save and upload through the app's **Admin: Upload Questions CSV** button.

---

## Instructions for Claude

You are writing multiple-choice review questions for the Philippine **Licensure Examination for Teachers (LET)**. Your output is uploaded directly into an app by a simple CSV parser, so the format rules below are strict. Breaking one usually means rows are silently skipped or the whole upload fails.

### Output

Reply with **one CSV code block only**, then a short summary table (count per Subject and per Bloom level). No other prose inside the code block.

The first line must be exactly this header:

```
Question Number,Topic,Bloom Taxonomy,Question,Choice A,Choice B,Choice C,Choice D,Answer,Explanation
```

### Columns

| # | Column | Required | Rules |
|---|---|---|---|
| 1 | Question Number | yes | 1, 2, 3… The app ignores it, but keep it for reference. |
| 2 | Topic | yes | Must be **exactly** one of the four values below, same spelling, capitals and `&`. |
| 3 | Bloom Taxonomy | yes | One of: `Remember`, `Understand`, `Apply`, `Analyze`, `Evaluate`, `Create` |
| 4 | Question | yes | The question stem. |
| 5–8 | Choice A–D | yes | Exactly four choices, all different, none empty. |
| 9 | Answer | yes | A single capital letter: `A`, `B`, `C` or `D`. |
| 10 | Explanation | recommended | 1–2 sentences on why the answer is correct. Shown to the learner after the quiz. |

**Allowed Topic values** (anything else will not appear in the category menus):

General Education:
- `Intellectual Competencies`
- `Personal & Civic Responsibilities`
- `Practical Skills Development`

Professional Education:
- `Professional Education`: covers child and adolescent development, facilitating learning, principles and strategies of teaching, curriculum development, assessment of learning, educational technology, the teaching profession, social dimensions of education, foundations of special and inclusive education, and relevant laws and DepEd policies (RA 7836, RA 10533, Code of Ethics for Professional Teachers, PPST).

### Hard formatting rules

1. **One question per line.** Never put a line break inside any field.
2. **Wrap every text field in double quotes** (`"..."`), especially if it contains a comma.
3. Inside a quoted field, write a literal double quote as two double quotes: `"The word ""pedagogy"" means…"`.
4. Every row must have **all 10 columns**. If there is no explanation, end the row with `,""`.
5. Use plain UTF-8 text. Filipino characters (ñ, ₱) are fine. No Markdown, HTML or emoji in fields.
6. Keep each reply to **100 questions or fewer** so the output doesn't get cut off. I'll ask for more batches if I need them.

### Question quality rules

- Exactly **one** defensibly correct answer. Distractors should be plausible but clearly wrong to someone who knows the material.
- Spread correct answers roughly evenly across A, B, C and D. Avoid long runs of the same letter.
- Avoid "All of the above", "None of the above" and "Both A and B".
- Keep choices similar in length and grammar so the answer isn't obvious from its form.
- Match the stated Bloom level: `Remember` = recall a fact, `Apply` = use a concept in a classroom scenario, `Analyze`/`Evaluate` = compare, judge or diagnose.
- Prefer realistic Philippine classroom scenarios (DepEd, K–12, MATATAG) for Apply and above.
- Do not repeat a question that has already been given in this chat.
- Filipino-language questions are welcome where the content calls for it (for example, Filipino or Panitikan).

### Bloom mix (matches the app's 150-item mock exam table of specifications)

When I don't specify a mix, aim for roughly this proportion within each Topic:

| Topic | Remember | Understand | Apply | Analyze | Evaluate | Create |
|---|---|---|---|---|---|---|
| Intellectual Competencies | 7 | 9 | 30 | 6 | 4 | 4 |
| Personal & Civic Responsibilities | 7 | 7 | 22 | 5 | 2 | 2 |
| Practical Skills Development | 8 | 7 | 23 | 4 | 2 | 1 |

For **Professional Education**, aim for roughly 10% Remember, 15% Understand, 45% Apply, 15% Analyze, 10% Evaluate and 5% Create. Prof Ed items should lean heavily on classroom scenarios.

In short, about half the questions should be **Apply**.

### Example output

```
Question Number,Topic,Bloom Taxonomy,Question,Choice A,Choice B,Choice C,Choice D,Answer,Explanation
1,"Intellectual Competencies","Remember","Who is known as the 'Ama ng Wikang Pambansa'?","Jose Rizal","Manuel L. Quezon","Andres Bonifacio","Apolinario Mabini","B","Manuel L. Quezon championed the adoption of a national language, earning him this title."
2,"Personal & Civic Responsibilities","Apply","A teacher notices a learner is consistently absent during fishing season. What is the most appropriate first step?","Report the learner to the principal","Mark the learner as dropped","Visit or contact the family to understand the situation","Give the learner failing grades","C","Understanding the learner's context through home contact comes before any disciplinary or administrative action."
3,"Practical Skills Development","Analyze","Most of a class answered item 12 incorrectly, choosing the same distractor. What does this most likely indicate?","The item is too easy","The learners guessed randomly","A shared misconception or a flawed item","The answer key is irrelevant","C","When many learners pick the same wrong option, either they share a misconception or the item itself is misleading."
4,"Intellectual Competencies","Understand","In the sentence ""She quickly finished her report, then left,"" what part of speech is ""quickly""?","Adjective","Adverb","Verb","Preposition","B","""Quickly"" modifies the verb ""finished,"" so it is an adverb."
5,"Professional Education","Apply","A Grade 4 teacher wants to check learners' understanding midway through a lesson without recording grades. Which assessment is most appropriate?","Summative unit test","Exit ticket formative check","Periodical examination","Standardized achievement test","B","A formative check like an exit ticket monitors learning during instruction and is not meant for grading."
```

Row 4 shows how to write quotes and commas inside a field.

### Self-check before replying

- [ ] Header line matches exactly.
- [ ] Every row has 10 columns and no line breaks inside fields.
- [ ] Every Topic is one of the four allowed values, spelled exactly.
- [ ] Every Bloom value is one of the six allowed words.
- [ ] Every Answer is a single letter A–D, and that choice really is correct.
- [ ] No duplicate choices within a question; no repeated questions.
- [ ] 100 rows or fewer.

---

## How I upload it (notes for me)

1. Copy the CSV block into a text editor (Notepad or VS Code) and save it as `something.csv` with **UTF-8** encoding. If you edit it in Excel, save as **CSV UTF-8 (Comma delimited)**.
2. Log in to the app with the admin account, scroll to **Admin: Upload Questions CSV**, and choose the file.
3. It should say *"Success! Uploaded N questions"*. Any rows it rejected are listed as *"Skipped X: line 5 (answer "E" is not A-D), …"*. Fix those lines and upload just them again. Big files are fine, because the app saves them in chunks.
4. Click **🔍 Validate Questions** to scan for missing choices, duplicate choices and duplicate questions, and fix or delete them there.
5. **Uploading the same file twice creates duplicates.** The app has no automatic de-duplication, so use the validator to clean them up.

---

## My Request

- **Topic(s):** <!-- e.g. Professional Education, Intellectual Competencies, or all GenEd -->
- **Specific subject area:** <!-- e.g. English grammar, Philippine history; for Prof Ed: assessment of learning, child development -->
- **Number of questions:** <!-- up to 100 per reply -->
- **Bloom mix:** <!-- "default" or e.g. 50% Apply, 30% Understand, 20% Analyze -->
- **Language:** <!-- English / Filipino / mixed -->
- **Start numbering at:** <!-- e.g. 1, or 201 if continuing a previous batch -->
- **Anything to avoid or focus on:** <!-- optional -->
