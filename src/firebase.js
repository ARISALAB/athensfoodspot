
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == "aris.alampourinos@gmail.com";
    }

    match /restaurants/{restaurantId} {

      // Οι επισκέπτες βλέπουν μόνο δημοσιευμένα εστιατόρια.
      // Ο διαχειριστής μπορεί να διαβάζει όλες τις καταχωρίσεις.
      allow read: if isAdmin()
        || resource.data.status == "published";

      // Μόνο ο συγκεκριμένος συνδεδεμένος διαχειριστής
      // μπορεί να δημιουργεί, να τροποποιεί ή να διαγράφει.
      allow create, update, delete: if isAdmin();
    }
  }
}
