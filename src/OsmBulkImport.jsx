import React, { useMemo, useState } from "react";
import { saveRestaurant } from "./data";

const AREAS = {
  syntagma: { label: "Σύνταγμα", bbox: "37.9720,23.7270,37.9798,23.7400" },
  plaka: { label: "Πλάκα", bbox: "37.9680,23.7240,37.9745,23.7375" },
  monastiraki: { label: "Μοναστηράκι", bbox: "37.9740,23.7190,37.9798,23.7295" }
};
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

function norm(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9α-ω]+/gi, " ").trim();
}
function slugify(value = "") {
  const map = { ά:"a",α:"a",β:"v",γ:"g",δ:"d",έ:"e",ε:"e",ζ:"z",ή:"i",η:"i",θ:"th",ί:"i",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ό:"o",ο:"o",π:"p",ρ:"r",σ:"s",ς:"s",τ:"t",ύ:"y",υ:"y",φ:"f",χ:"ch",ψ:"ps",ώ:"o",ω:"o" };
  return String(value).toLowerCase().split("").map(c => map[c] || c).join("")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "restaurant";
}
function category(tags = {}) {
  const cuisine = (tags.cuisine || "").split(";")[0].replace(/_/g, " ").trim();
  if (cuisine) return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
  return ({ cafe: "Καφέ", fast_food: "Fast food", bar: "Bar", pub: "Pub", food_court: "Food court" })[tags.amenity] || "Εστιατόριο";
}
function address(tags = {}, area) {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  return [street, tags["addr:postcode"], tags["addr:suburb"] || tags["addr:neighbourhood"] || area, "Αθήνα"].filter(Boolean).join(", ");
}
async function searchOSM(bbox) {
  const query = `[out:json][timeout:25];(nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court)$"]["name"](${bbox}););out center tags;`;
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: query }).toString()
      });
      if (!response.ok) throw new Error(`Η υπηρεσία OSM απάντησε με κωδικό ${response.status}.`);
      const data = await response.json();
      return Array.isArray(data.elements) ? data.elements : [];
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("Αποτυχία σύνδεσης με το OpenStreetMap.");
}

const panel = { background: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, marginBottom: 24 };
const btn = { border: 0, borderRadius: 9, padding: "10px 14px", fontWeight: 700, cursor: "pointer" };

export default function OsmBulkImport({ existingRestaurants = [], onImported }) {
  const [areaKey, setAreaKey] = useState("syntagma");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searched, setSearched] = useState(false);

  const existingOsmIds = useMemo(() => new Set(existingRestaurants.map(x => String(x.osmId || "")).filter(Boolean)), [existingRestaurants]);
  const existingIds = useMemo(() => new Set(existingRestaurants.map(x => String(x.id || ""))), [existingRestaurants]);
  const existingNames = useMemo(() => new Set(existingRestaurants.map(x => `${norm(x.name)}|${norm(x.address)}`)), [existingRestaurants]);

  const rows = useMemo(() => results.map(item => {
    const tags = item.tags || {};
    const osmId = `${item.type}-${item.id}`;
    const name = tags.name || "";
    const streetAddress = address(tags, AREAS[areaKey].label);
    const duplicate = existingOsmIds.has(osmId) || existingIds.has(`osm-${osmId}`) ||
      existingNames.has(`${norm(name)}|${norm(streetAddress)}`);
    return {
      osmId, osmType: item.type, name, address: streetAddress, duplicate, tags,
      cuisine: category(tags),
      phone: tags.phone || tags["contact:phone"] || "",
      website: tags.website || tags["contact:website"] || "",
      lat: Number.isFinite(item.lat) ? item.lat : (item.center?.lat ?? null),
      lon: Number.isFinite(item.lon) ? item.lon : (item.center?.lon ?? null),
      url: `https://www.openstreetmap.org/${item.type}/${item.id}`
    };
  }), [results, areaKey, existingOsmIds, existingIds, existingNames]);

  const newRows = rows.filter(x => !x.duplicate);
  const selectedCount = newRows.filter(x => selected[x.osmId]).length;

  async function runSearch() {
    setLoading(true); setError(""); setMessage(""); setResults([]); setSelected({}); setSearched(false);
    try {
      const elements = await searchOSM(AREAS[areaKey].bbox);
      const unique = new Map();
      elements.filter(x => x.tags?.name).forEach(x => unique.set(`${x.type}-${x.id}`, x));
      const found = [...unique.values()].sort((a,b) => String(a.tags.name).localeCompare(String(b.tags.name), "el"));
      setResults(found);
      setSelected(Object.fromEntries(found.map(x => [`${x.type}-${x.id}`, true])));
      setSearched(true);
      if (!found.length) setMessage("Δεν βρέθηκαν ονομαστές επιχειρήσεις σε αυτή την περιοχή.");
    } catch (e) {
      setError(`${e?.message || "Η αναζήτηση απέτυχε"} Δοκίμασε ξανά σε λίγο.`);
    } finally { setLoading(false); }
  }

  function selectAll(checked) {
    setSelected(Object.fromEntries(newRows.map(x => [x.osmId, checked])));
  }

  async function importSelected() {
    const chosen = newRows.filter(x => selected[x.osmId]);
    if (!chosen.length) { setError("Επίλεξε τουλάχιστον μία καταχώριση."); return; }
    setSaving(true); setError(""); setMessage("");
    let saved = 0;
    const failures = [];
    for (const item of chosen) {
      try {
        await saveRestaurant({
          id: `osm-${item.osmId}`,
          osmId: item.osmId,
          osmType: item.osmType,
          source: "OpenStreetMap",
          sourceUrl: item.url,
          name: item.name,
          slug: `${slugify(item.name)}-${item.osmId.replace(/[^a-z0-9-]/gi, "-")}`,
          area: AREAS[areaKey].label,
          cuisine: item.cuisine,
          price: "",
          address: item.address,
          phone: item.phone,
          website: item.website,
          description: "",
          image: "",
          status: "draft",
          featured: false,
          demo: false,
          latitude: item.lat,
          longitude: item.lon
        });
        saved++;
      } catch (e) { failures.push(`${item.name}: ${e?.message || "αποτυχία αποθήκευσης"}`); }
    }
    setSaving(false);
    setMessage(`Αποθηκεύτηκαν ${saved} καταχωρίσεις ως πρόχειρες (draft).${failures.length ? ` Απέτυχαν ${failures.length}.` : ""}`);
    if (failures.length) setError(failures.slice(0, 4).join(" · "));
    setSelected(previous => {
      const next = { ...previous };
      chosen.forEach(x => delete next[x.osmId]);
      return next;
    });
    if (saved && onImported) await onImported();
  }

  return (
    <section style={panel} aria-labelledby="osm-bulk-title">
      <h2 id="osm-bulk-title" style={{ margin: "0 0 8px", fontSize: 22 }}>Μαζική εισαγωγή εστιατορίων</h2>
      <p style={{ margin: "0 0 16px", color: "#4b5563", lineHeight: 1.55 }}>
        Αναζήτηση από OpenStreetMap, έλεγχος πιθανών διπλοτύπων και εισαγωγή στο Firebase ως πρόχειρες καταχωρίσεις.
        Δεν δημοσιεύεται τίποτα αυτόματα.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
          Περιοχή
          <select value={areaKey} disabled={loading || saving} onChange={e => { setAreaKey(e.target.value); setResults([]); setSearched(false); setError(""); setMessage(""); }}
            style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", background: "#fff" }}>
            {Object.entries(AREAS).map(([key, area]) => <option key={key} value={key}>{area.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={loading || saving} onClick={runSearch} style={{ ...btn, background: "#2563eb", color: "#fff" }}>
          {loading ? "Αναζήτηση…" : "Αναζήτηση στο OpenStreetMap"}
        </button>
        {searched && newRows.length > 0 && <button type="button" disabled={saving} onClick={() => selectAll(selectedCount !== newRows.length)} style={{ ...btn, background: "#f3f4f6", color: "#111827" }}>
          {selectedCount === newRows.length ? "Αποεπιλογή όλων" : "Επιλογή όλων των νέων"}
        </button>}
      </div>
      {message && <p role="status" style={{ padding: 12, background: "#ecfdf5", color: "#065f46", borderRadius: 8 }}>{message}</p>}
      {error && <p role="alert" style={{ padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 8 }}>{error}</p>}
      {searched && <>
        <p style={{ fontSize: 14, color: "#374151" }}>Βρέθηκαν <strong>{rows.length}</strong> · πιθανά διπλότυπα <strong>{rows.length - newRows.length}</strong> · νέες καταχωρίσεις <strong>{newRows.length}</strong>.</p>
        {rows.length > 0 && <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <table style={{ width: "100%", minWidth: 650, borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f9fafb", textAlign: "left" }}>
              <th style={{ padding: 10 }}>Επιλογή</th><th style={{ padding: 10 }}>Επιχείρηση</th><th style={{ padding: 10 }}>Κατηγορία</th><th style={{ padding: 10 }}>Διεύθυνση</th><th style={{ padding: 10 }}>Επικοινωνία</th>
            </tr></thead>
            <tbody>{rows.map(item => <tr key={item.osmId} style={{ borderTop: "1px solid #e5e7eb", opacity: item.duplicate ? 0.58 : 1 }}>
              <td style={{ padding: 10 }}>{item.duplicate ? "Υπάρχει" : <input type="checkbox" aria-label={`Επιλογή ${item.name}`} checked={Boolean(selected[item.osmId])} disabled={saving} onChange={e => setSelected(prev => ({ ...prev, [item.osmId]: e.target.checked }))} />}</td>
              <td style={{ padding: 10, fontWeight: 700 }}>{item.name}<div style={{ fontWeight: 400, marginTop: 4 }}><a href={item.url} target="_blank" rel="noreferrer">Πηγή OSM ↗</a></div></td>
              <td style={{ padding: 10 }}>{item.cuisine}</td><td style={{ padding: 10 }}>{item.address}</td>
              <td style={{ padding: 10 }}>{item.phone && <div>{item.phone}</div>}{item.website && <div><a href={item.website} target="_blank" rel="noreferrer">Ιστοσελίδα ↗</a></div>}{!item.phone && !item.website && "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>Πηγή: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · Άδεια ODbL. Επιβεβαίωσε τα στοιχεία πριν από τη δημοσίευση.</p>
        <button type="button" disabled={saving || selectedCount === 0} onClick={importSelected} style={{ ...btn, background: "#111827", color: "#fff", opacity: saving || selectedCount === 0 ? 0.55 : 1 }}>
          {saving ? "Αποθήκευση…" : `Εισαγωγή επιλεγμένων (${selectedCount}) ως πρόχειρα`}
        </button>
      </>}
    </section>
  );
}
