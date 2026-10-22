# AthensFoodSpot — v1

Οδηγός εστιατορίων για Αθήνα και Αττική. React + Vite + Firebase Firestore + Firebase Authentication, έτοιμο για Netlify.

## 1. Τοπική εκτέλεση

Απαιτείται Node.js 20 ή νεότερο.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Χωρίς Firebase ρυθμισμένο, η αρχική σελίδα λειτουργεί με ενδεικτικές demo καταχωρίσεις. Οι demo καταχωρίσεις δεν αντιστοιχούν σε επαληθευμένες επιχειρήσεις.

## 2. Δημιουργία Firebase project

1. Άνοιξε https://console.firebase.google.com/ και δημιούργησε project.
2. Πρόσθεσε εφαρμογή Web (</>), αντέγραψε το config στο `.env.local`.
3. Στο Authentication → Sign-in method ενεργοποίησε Email/Password.
4. Στο Firestore Database δημιούργησε βάση.
5. Ρύθμισε τους κανόνες από το `firestore.rules`.
6. Δημιούργησε λογαριασμό διαχειριστή στο Authentication.

### Σημαντικό για τα δικαιώματα διαχειριστή

Το `VITE_ADMIN_EMAIL` είναι μόνο έλεγχος εμφάνισης στη διεπαφή — δεν αποτελεί ασφάλεια. Οι Firestore rules απαιτούν custom claim `admin: true`. Πριν ενεργοποιήσεις εγγραφές, δημιούργησε το claim με έμπιστο περιβάλλον Firebase Admin SDK (π.χ. Cloud Functions / Cloud Run ή τοπικό ασφαλές script με service account που δεν ανεβαίνει στο GitHub). Μην το δημιουργήσεις από client-side κώδικα και μην ανεβάσεις service-account JSON στο repository.

Για να αναθέσεις custom claim, ένα έμπιστο περιβάλλον server-side μπορεί να εκτελέσει:
```js
await getAuth().setCustomUserClaims(uid, { admin: true });
```
Αυτό το snippet προορίζεται μόνο για ασφαλές περιβάλλον Admin SDK, όχι για browser.

### Προτεινόμενο schema

Collection `restaurants`, ένα document ανά εστιατόριο:
```json
{
  "name": "Όνομα επιχείρησης",
  "slug": "onoma-epixeirisis",
  "area": "Περιοχή",
  "cuisine": "Κατηγορία",
  "address": "Διεύθυνση",
  "description": "Πρωτότυπη περιγραφή",
  "image": "https://...",
  "status": "published",
  "featured": false,
  "sourceUrl": "https://...",
  "lastVerifiedAt": "2026-10-22"
}
```
Το `status` είναι `draft` ή `published`. Η δημόσια εφαρμογή διαβάζει μόνο `published`.

## 3. Μεταβλητές περιβάλλοντος

Συμπλήρωσε στο `.env.local` τις τιμές από Firebase Project settings → Your apps → SDK setup and configuration.

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAIL=your-admin-email@example.com
```

Οι Firebase web config τιμές είναι client config, όχι μυστικό server credential. Η ασφάλεια βασίζεται στους Firestore Rules, Authentication και App Check (συνιστάται σε παραγωγή).

## 4. Δημοσίευση σε GitHub + Netlify

1. Δημιούργησε άδειο GitHub repository, π.χ. `athensfoodspot`.
2. Αντέγραψε τα αρχεία του project στο repository.
3. Εκτέλεσε:
```bash
git init
git add .
git commit -m "Initial AthensFoodSpot v1"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/athensfoodspot.git
git push -u origin main
```
4. Στο Netlify → Add new site → Import an existing project → GitHub, διάλεξε το repository.
5. Build command: `npm run build`; publish directory: `dist`.
6. Netlify → Site configuration → Environment variables: πρόσθεσε τις ίδιες `VITE_FIREBASE_*` και `VITE_ADMIN_EMAIL`.
7. Κάνε redeploy.

Το `netlify.toml` έχει ήδη redirect για React Router ώστε οι διαδρομές `/restaurant/...` και `/admin` να φορτώνουν σωστά.

## 5. Domain

Μόλις κατοχυρώσεις το domain, πρόσθεσέ το στο Netlify → Domain management → Add a domain. Ακολούθησε τις DNS οδηγίες που θα εμφανίσει το Netlify. Μην αλλάξεις DNS records βάσει υποθέσεων· χρησιμοποίησε τις τιμές που δείχνει το project σου.

## 6. Πριν από πραγματική παραγωγή

- Αντικατάστησε όλες τις demo καταχωρίσεις και σημείωσε τις δοκιμαστικές καθαρά.
- Χρησιμοποίησε εικόνες με άδεια εμπορικής χρήσης.
- Έλεγξε τα στοιχεία επιχειρήσεων και κράτησε πηγή/ημερομηνία επαλήθευσης.
- Πρόσθεσε πολιτική απορρήτου, cookies/analytics disclosure όπου απαιτείται, όρους χρήσης και διαδικασία διόρθωσης/αφαίρεσης καταχωρίσεων.
- Πρόσθεσε server-rendering ή prerendering για ισχυρότερο SEO. Η απλή SPA έκδοση είναι λειτουργική, αλλά δεν είναι η ιδανική τελική αρχιτεκτονική για μεγάλο SEO directory.
- Πρόσθεσε Firebase App Check, monitoring και περιορισμούς κόστους.
- Ρύθμισε custom admin claim πριν επιτρέψεις δημιουργία/ενημέρωση/διαγραφή.

## Σημείωση

Η v1 είναι ένα λειτουργικό starter project. Δεν περιλαμβάνει ακόμη ροή «διεκδίκησης καταχώρισης» από ιδιοκτήτες, upload εικόνων στο Firebase Storage, αυτοματοποιημένη εισαγωγή καταλόγου, SSR/prerendering ή server-side ανάθεση custom claims.
