# Campus Academy — Phase 1 (Core MVP)

Jukwaa la kujifunza la kisasa, la Kiswahili-first, lenye gamification (XP, level, streak) —
limejengwa kwa Firebase (Auth + Firestore + Storage + Cloud Functions) na React.

Hii ni **Phase 1** kutoka kwenye mpango wa awamu (spec section 37):
Auth, student whitelist, dashibodi ya mwanafunzi, dashibodi ya admin, Course → Stage → Topic,
usomaji wa somo mtandaoni, quiz yenye alama za kiotomatiki (server-side), stage unlocking,
XP na streak ya msingi, picha ya profaili, na cheti cha msingi + ukurasa wa uthibitishaji.

Haijajumuisha bado (Phase 3): practical labs (CTF-style), competition system, advanced anti-cheating.

Phase 2 (imeongezwa): badges (auto-awarded server-side), student chat (na moderation), notifications +
matangazo ya admin, na uchambuzi wa hali ya juu (course analytics) kwa admin.

---

## 1. Muundo wa Mradi

```
campus-academy/
├── firebase.json
├── firestore/
│   ├── firestore.rules       # Server-authoritative security rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── functions/                 # Cloud Functions (Node.js) — XP/scoring/whitelist logic
│   ├── src/
│   │   ├── admin.js           # Firebase Admin SDK init
│   │   ├── auth.js            # import students, activate account, reset password
│   │   ├── quiz.js            # serve quiz (no answers), score submissions, XP, streak, unlock
│   │   ├── content.js         # admin: create course/stage/topic/question, publish
│   │   ├── certificate.js     # issue/revoke certificates
│   │   ├── leaderboard.js     # rebuild leaderboard, chat moderation
│   │   └── auditLog.js
│   └── scripts/
│       ├── setSuperAdmin.js   # one-time: create the first Super Admin
│       └── seed.js            # demo course + questions
└── frontend/                  # React (Vite) + Tailwind
    └── src/
        ├── pages/              # Login, Activate, Dashboard, Course/Stage/Topic, Profile, Leaderboard
        └── pages/admin/        # AdminDashboard, StudentImport, CourseBuilder, AuditLogs
```

---

## 2. Jinsi Uthibitishaji (Auth) Unavyofanya Kazi

Wanafunzi hawajisajili wenyewe. Mtiririko ni:

1. **Admin anaingiza wanafunzi** (CSV: Registration Number, First Name, Last Name) kupitia
   `/admin/students`. Hii inaita Cloud Function `importStudents`, ambayo inaunda hati kwenye
   collection `approvedStudents` yenye `activationCode` ya nasibu kwa kila mwanafunzi.
2. Admin anawapa wanafunzi namba yao ya usajili + activation code (offline — orodha iliyochapishwa,
   SMS, n.k). **Hakuna password ya kudumu ya jina la ukoo** — kila mwanafunzi anaweka password yake mwenyewe.
3. Mwanafunzi anafungua `/activate`, anaingiza Registration Number + activation code + password mpya.
   Cloud Function `activateAccount` inathibitisha, kisha inaunda akaunti ya Firebase Auth
   (kwa barua pepe ya ndani `regnumber@students.campusacademy.app`) na kuweka `custom claim: role=student`.
4. Kuanzia hapo, mwanafunzi anaingia kwa kawaida (`signInWithEmailAndPassword`) kwenye `/login`
   kwa kutumia Registration Number (inabadilishwa kiotomatiki kuwa email ya ndani) + password yake.

**Kikomo kinachojulikana (documented tradeoff):** kwa sababu tunatumia Firebase Auth ya kawaida,
ujumbe wa hitilafu wa Firebase unaweza kutofautisha "akaunti haipo" dhidi ya "password si sahihi"
kwa kiwango fulani. Kwa kikundi kidogo kilichofungwa (closed cohort) hatari hii ni ndogo, lakini
kwa uzalishaji mkubwa zaidi, fikiria kutumia Cloud Function ya kati (proxy) inayorudisha ujumbe
mmoja wa jumla kila mara.

---

## 3. Jinsi Alama za Quiz Zinavyohesabiwa (Server-Side Only)

- Frontend haiwahi kuona jibu sahihi. `getQuizQuestions` inarudisha maswali bila `correctAnswer`.
- Mwanafunzi anatuma majibu yake (`{questionId: "A"|"B"|"C"|"D"}`) kwa `submitQuizAttempt`.
- Cloud Function hii pekee ndiyo inasoma majibu sahihi kutoka Firestore, inahesabu alama,
  inaandika `quizAttempts`, inasasisha `progress`, na inatoa XP — yote kwa Firestore Security
  Rules zinazozuia mwanafunzi kuandika moja kwa moja kwenye `xp`, `score`, au `unlockedStages`.

## 4. Jinsi Stage Unlocking Inavyofanya Kazi

Baada ya kila quiz kufaulu, `submitQuizAttempt` inaangalia kama mada zote (topics) zilizochapishwa
kwenye stage husika zimekamilika. Kama ndiyo: stage inawekwa alama "imekamilika", XP ya ziada
(`completeStage`) inatolewa, na stage inayofuata (kwa `order`) inafunguliwa kiotomatiki kwenye
`students/{uid}.unlockedStages`.

---

## 5. Usanidi wa Awali (Setup)

### Mahitaji
- Node.js 20+
- Akaunti ya Firebase (bure) — [console.firebase.google.com](https://console.firebase.google.com)
- Firebase CLI: `npm install -g firebase-tools`

### Hatua

```bash
# 1. Unda mradi mpya kwenye Firebase Console, washa: Authentication (Email/Password),
#    Firestore, Storage, na Cloud Functions (Blaze plan inahitajika kwa Functions —
#    bado ni bure kwa matumizi madogo ya MVP, tazama sehemu ya 8 hapa chini).

# 2. Ingia kwenye Firebase CLI na unganisha mradi
firebase login
firebase use --add   # chagua project ID yako

# 3. Functions
cd functions
npm install
cp scripts/serviceAccountKey.json.example scripts/serviceAccountKey.json  # jaza na key halisi
# (Pakua kutoka Firebase Console > Project settings > Service accounts > Generate new private key)

# 4. Frontend
cd ../frontend
npm install
cp .env.example .env
# Jaza .env na maelezo ya Firebase Console > Project settings > Your apps > SDK config

# 5. Deploy Firestore/Storage rules na Cloud Functions
cd ..
firebase deploy --only firestore:rules,storage:rules,functions

# 6. Unda Super Admin wa kwanza (mara moja tu)
cd functions
node scripts/setSuperAdmin.js admin@example.com "PasswordImara123!" "Jina Lako"

# 7. (Hiari) Jaza data ya mfano ya kozi
node scripts/seed.js
```

### Local Development (Emulators)

```bash
firebase emulators:start --only auth,firestore,functions,storage
# kwenye terminal nyingine:
cd frontend && npm run dev
```

Fungua http://localhost:5173

### Deploy ya Uzalishaji (Hosting)

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

---

## 6. Kuingia kama Admin

Baada ya `setSuperAdmin.js`, ingia kupitia `/login` kama mwanafunzi wa kawaida ndani ya Firebase
Auth (email + password uliyoweka), kisha uelekezwe moja kwa moja `/admin` kwa sababu `custom claim`
yako ni `super_admin`. (Ukurasa wa `/login` wa sasa unatarajia Registration Number — kwa admin,
tumia console ya Firebase Auth moja kwa moja au ongeza ukurasa mdogo tofauti wa admin-login
unaotumia email moja kwa moja; hii ni maboresho rahisi ya haraka kwa Phase 1.5.)

## 7. Kuingiza Wanafunzi

`/admin/students` → bandika CSV (Registration Number, First Name, Last Name) → "Ingiza Wanafunzi".
Mfumo utaonyesha activation code kwa kila mwanafunzi — nakili na uwape offline.

## 8. Gharama ($0 kuanzia)

- **Firebase Spark Plan**: Auth, Firestore, Storage — bure kabisa kwa matumizi madogo.
- **Cloud Functions** zinahitaji Blaze Plan (pay-as-you-go), lakini Blaze bado ina kiwango cha
  bure cha kila mwezi (mfano: maombi milioni 2 ya kwanza ya functions ni bure kila mwezi) —
  kwa MVP ya wanafunzi wachache, gharama halisi ni karibu $0. Weka budget alert kwenye
  Google Cloud Console ili kuepuka mshangao.
- **Firebase Hosting**: bure hadi GB 10 za uhamishaji kwa mwezi.

---

## 9. Majaribio (Testing) — Mtiririko wa Kukubali (Acceptance Flow)

Kufuatana na spec section 52:

**Admin:** login → ingiza wanafunzi → unda kozi → unda stage → unda mada → ongeza maswali 10+ → chapisha.
**Mwanafunzi:** activate account → login → pakia picha → fungua dashibodi → soma somo → fanya quiz →
ona alama → ona XP imeongezeka → ona streak → stage inayofuata inafunguka.

Jaribu mtiririko huu mzima kwenye Firebase Emulators kabla ya deploy ya uzalishaji.

Maeneo muhimu ya kuandika automated tests baadaye (Jest + Firebase emulator):
Authentication/whitelist validation, quiz scoring, stage unlocking, XP calculation,
streak calculation, admin permission boundaries, file upload validation.

---

## 10. Usalama — Nini Kimefanywa Tayari

- XP, alama, stage unlocks, na certificates: **haziwezi kubadilishwa na frontend** —
  Firestore rules zinaruhusu maandishi ya sehemu hizo kupitia Cloud Functions (Admin SDK) pekee.
- Majibu sahihi ya maswali: hayafikiki kamwe na mwanafunzi (subcollection `questions` imefungwa).
- Uploads za picha: zimefungwa kwa aina ya faili (JPEG/PNG/WebP) na ukubwa (<3MB), kila mwanafunzi
  anaweza kuandika kwenye folder yake pekee.
- Audit logs: kila kitendo muhimu cha admin/mwanafunzi kinarekodiwa; hakuna password
  inayowekwa kwenye logs.
- Certificate verification (`/certificate/:certId`): inaonyesha taarifa zisizo za siri pekee.

## 11. Hatua Zinazofuata (Phase 3)

Angalia spec ya awali (sehemu 37) — practical labs (CTF-style), competition system,
advanced anti-cheating, QR verification kwenye vyeti.

## 12. Phase 2 — Vipengele Vipya

### Badges (Beji)
- Admin anaunda beji kupitia `/admin/badges` (au anatumia "Unda Beji za Mfano" kwa mifano 4 ya haraka:
  7 Day Warrior, Perfect Score, Security Rookie, Fast Learner).
- Kila beji ina `criteria` moja kati ya: `streak_days`, `perfect_score`, `first_stage_complete`,
  `fast_quiz`, `course_complete`.
- Baada ya kila `submitQuizAttempt`, Cloud Function `checkAndAwardBadges` inapima vigezo hivi
  dhidi ya hali ya sasa ya mwanafunzi na kutoa beji mpya kiotomatiki + arifa (notification).
  Hii haiwezi kudanganywa na frontend — inatokea server-side pekee.

### Mazungumzo (Chat)
- `/chat` — vyumba viwili vya awali: "Majadiliano ya Jumla" na "Maswali na Majibu".
- Ujumbe unahifadhiwa Firestore (`chatRooms/{roomId}/messages`), unaonekana kwa wakati halisi
  (`onSnapshot`). Mwanafunzi anaweza kufuta ujumbe wake mwenyewe pekee; Admin anaweza kufuta ujumbe wowote.

### Taarifa (Notifications) na Matangazo
- Taarifa binafsi (`notifications` collection) zinaundwa kiotomatiki wakati: beji imepatikana,
  stage imefunguliwa, au (kila siku saa ~18:00 EAT) mwanafunzi mwenye mfululizo hai bado
  hajafanya shughuli leo — `streakReminderScheduled`.
- Matangazo ya jumla (`/admin/announcements`) yanaandikwa hati MOJA inayosomwa na wanafunzi wote
  (badala ya kuandika hati kwa kila mwanafunzi — nafuu zaidi kwa idadi kubwa).
- Kengele ya arifa (🔔) kwenye NavBar inaonyesha zote mbili — taarifa binafsi na matangazo ya hivi karibuni.

### Uchambuzi wa Hali ya Juu (Course Analytics)
- `/admin/analytics` — chagua kozi, ona: jumla ya majaribio ya quiz, wastani wa alama,
  idadi ya waliomaliza kozi, na utendaji kwa kila mada (attempts, pass rate, wastani).
- Inahesabiwa kwa `getCourseAnalytics` (Cloud Function) kwa ombi (on-demand) — inafaa kwa
  ukubwa wa MVP; kwa idadi kubwa zaidi ya wanafunzi, hii inaweza kuhamishiwa kwenye
  scheduled pre-aggregation job.

## 13. Phase 3 — Vipengele Vipya

### Mazoezi ya Vitendo (Practical Labs / CTF)
- Admin anaunda lab kupitia `/admin/labs`: jina, maelekezo, na **flag sahihi**. Flag haihifadhiwi
  kamwe kama maandishi wazi — inahesabiwa kama `SHA-256(salt:flag)` na salt ya nasibu, kisha
  hash + salt tu ndivyo vinavyohifadhiwa Firestore.
- Mwanafunzi anawasilisha jibu lake kupitia `submitLabFlag` — Cloud Function inahesabu hash ya
  jibu lililowasilishwa na kulinganisha na hash iliyohifadhiwa. XP inatolewa mara moja tu kwa kila lab.
- Onyo la spec section 26: labs zote ni za mazingira ya mafunzo yaliyodhibitiwa — jukwaa
  halijaundwa kuhimiza mashambulizi dhidi ya mifumo halisi ya watu wengine.

### Mashindano (Competition System)
- `createCompetition` (admin, imefungwa kwa kozi moja) → `runQualification` inahesabu alama
  iliyopimwa kwa kila mwanafunzi hai: `quizzes% × 0.3 + labs% × 0.4 + finalAssessment% × 0.3`
  (uzito unaoweza kubadilishwa), inapanga, na kuchagua Top N (chaguo-msingi 5) kama washiriki
  wa mwisho.
- Raundi za mashindano ya mwisho (Knowledge / Practical / Final) — alama zinaingizwa na Admin
  kwa mkono kupitia `submitRoundScore` (spec inasisitiza mashindano ya mwisho yanahitaji usimamizi
  wa moja kwa moja, si otomatiki kabisa).
- `publishFinalResults` inajumlisha alama za raundi zote, inapanga, na kutoa medali 🥇🥈🥉 — tu
  baada ya Admin kukagua na kuthibitisha.

### Anti-Cheating ya Hali ya Juu
- Admin anaweza kuwasha "Assessment Mode" kwa mada yoyote (`setTopicAssessmentMode`) na kuweka
  kikomo cha muda.
- Wakati wa mtihani: kipima muda kinaonekana, tab-switch/window-blur inagundulika na
  `logSuspiciousEvent` (idadi ya matukio inahesabiwa **server-side**, hivyo mwanafunzi hawezi
  kuizungusha kwa ku-refresh ukurasa), na baada ya matukio 3 au muda kuisha, jibu linawasilishwa
  kiotomatiki.
- Kama spec inavyosisitiza: hii inafanya udanganyifu kuwa mgumu zaidi na kurekodi tabia za
  kutiliwa shaka — HAIWEZI kuzuia udanganyifu kikamilifu kwenye kivinjari. Kwa mashindano
  muhimu ya mwisho, tumia usimamizi wa ana kwa ana (proctored) kama spec inavyopendekeza.

### Vyeti + QR Verification
- `/admin/certificates` inaonyesha wanafunzi waliokamilisha stage ya mwisho ya kozi na kitufe
  cha "Toa Cheti" (`issueCertificate`).
- Mwanafunzi anaona vyeti vyake kwenye `/certificates`.
- Ukurasa wa uthibitishaji wa umma (`/certificate/:certId`, hauhitaji login) sasa unaonyesha
  picha ya QR inayoelekeza kwenye kiungo hicho hicho cha uthibitishaji — rahisi kuchanganua
  kutoka kwenye cheti kilichochapishwa.
