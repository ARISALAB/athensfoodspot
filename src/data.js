
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import { db, configured } from "./firebase";

export const demoRestaurants = [
  {
    id: "demo-plaka-meze",
    name: "Το Στέκι της Πλάκας",
    slug: "to-steki-tis-plakas",
    area: "Πλάκα",
    cuisine: "Μεζεδοπωλείο",
    price: "€€",
    address: "Πλάκα, Αθήνα",
    phone: "",
    website: "",
    description:
      "Ενδεικτική καταχώριση επίδειξης. Αντικαταστήστε την με επιβεβαιωμένα στοιχεία πραγματικής επιχείρησης.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80",
    status: "published",
    featured: true,
    demo: true
  },
  {
    id: "demo-seafood-piraeus",
    name: "Θαλασσινή Γωνιά",
    slug: "thalassini-gonia",
    area: "Πειραιάς",
    cuisine: "Ψαροταβέρνα",
    price: "€€€",
    address: "Πειραιάς, Αττική",
    phone: "",
    website: "",
    description:
      "Ενδεικτική καταχώριση επίδειξης. Δεν αντιστοιχεί σε επαληθευμένο εστιατόριο.",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80",
    status: "published",
    featured: true,
    demo: true
  },
  {
    id: "demo-grill-nikaia",
    name: "Η Παρέα στη Νίκαια",
    slug: "i-parea-sti-nikaia",
    area: "Νίκαια",
    cuisine: "Ψητοπωλείο",
    price: "€",
    address: "Νίκαια, Αττική",
    phone: "",
    website: "",
    description:
      "Ενδεικτική καταχώριση επίδειξης. Δεν αντιστοιχεί σε επαληθευμένο εστιατόριο.",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    status: "published",
    featured: false,
    demo: true
  },
  {
    id: "demo-brunch-glyfada",
    name: "Sunday Brunch Club",
    slug: "sunday-brunch-club",
    area: "Γλυφάδα",
    cuisine: "Brunch",
    price: "€€",
    address: "Γλυφάδα, Αττική",
    phone: "",
    website: "",
    description:
      "Ενδεικτική καταχώριση επίδειξης. Δεν αντιστοιχεί σε επαληθευμένο εστιατόριο.",
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1000&q=80",
    status: "published",
    featured: false,
    demo: true
  },
  {
    id: "demo-italian-kifisia",
    name: "Forno di Quartiere",
    slug: "forno-di-quartiere",
    area: "Κηφισιά",
    cuisine: "Ιταλικό",
    price: "€€",
    address: "Κηφισιά, Αττική",
    phone: "",
    website: "",
    description:
      "Ενδεικτική καταχώριση επίδειξης. Δεν αντιστοιχεί σε επαληθευμένο εστιατόριο.",
    image:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80",
    status: "published",
    featured: false,
    demo: true
  },
  {
    id: "demo-family-peristeri",
    name: "Το Οικογενειακό Τραπέζι",
    slug: "to-oikogeneiako-trapezi",
    area: "Περιστέρι",
    cuisine: "Ελληνική κουζίνα",
    price: "€€",
    address: "Περιστέρι, Αττική",
    phone: "",
    website: "",
    description:
      "Ενδεικτική καταχώριση επίδειξης. Δεν αντιστοιχεί σε επαληθευμένο εστιατόριο.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80",
    status: "published",
    featured: false,
    demo: true
  }
];

// Δημόσιος κατάλογος: επιστρέφει μόνο δημοσιευμένα εστιατόρια.
export async function loadRestaurants() {
  if (!configured) return demoRestaurants;

  try {
    const q = query(
      collection(db, "restaurants"),
      where("status", "==", "published"),
      orderBy("name", "asc"),
      limit(500)
    );

    const snap = await getDocs(q);

    return snap.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.error("Firestore load failed; using demo listings.", error);
    return demoRestaurants;
  }
}

// Διαχειριστικό: επιστρέφει όλες τις καταχωρίσεις,
// συμπεριλαμβανομένων των draft.
export async function loadAdminRestaurants() {
  if (!configured) {
    throw new Error("Το Firebase δεν έχει ρυθμιστεί.");
  }

  const q = query(
    collection(db, "restaurants"),
    orderBy("name", "asc"),
    limit(500)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

// Αποθήκευση: διατηρείται ο υπάρχων μηχανισμός setDoc.
export async function saveRestaurant(restaurant) {
  if (!configured) {
    throw new Error("Συμπλήρωσε πρώτα τη ρύθμιση Firebase.");
  }

  const id = restaurant.id || crypto.randomUUID();

  const payload = {
    ...restaurant,
    id: undefined,
    updatedAt: serverTimestamp(),
    ...(restaurant.id ? {} : { createdAt: serverTimestamp() })
  };

  delete payload.id;

  await setDoc(doc(db, "restaurants", id), payload, {
    merge: true
  });

  return id;
}

export async function removeRestaurant(id) {
  if (!configured) {
    throw new Error("Το Firebase δεν έχει ρυθμιστεί.");
  }

  await deleteDoc(doc(db, "restaurants", id));
}

export async function updateRestaurantStatus(id, status) {
  if (!configured) {
    throw new Error("Το Firebase δεν έχει ρυθμιστεί.");
  }

  await updateDoc(doc(db, "restaurants", id), {
    status,
    updatedAt: serverTimestamp()
  });
}
