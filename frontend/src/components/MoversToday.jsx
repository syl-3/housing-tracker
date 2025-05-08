// components/MoversTodayTable.jsx
import { useEffect, useState } from "react";

export default function MoversTodayTable({ date }) {
  const [listings, setListings] = useState([]);
  const [changes, setChanges] = useState({});

  useEffect(() => {
    if (!date) return;

    fetch(`http://localhost:5000/api/silver-by-date/${date}`)
      .then(res => res.json())
      .then(setListings)
      .catch(err => console.error("Fetch error:", err));

    fetch(`http://localhost:5000/api/silver-changes?date=${date}`)
      .then(res => res.json())
      .then(data => setChanges(data.changes || {}))
      .catch(err => console.error("Changes fetch error:", err));
  }, [date]);

  useEffect(() => {
  if (!date) return;

  fetch(`http://localhost:5000/api/silver-by-date/${date}`)
    .then(res => res.json())
    .then(data => {
      setListings(data);
      
    })
    .catch(err => console.error("Fetch error:", err));

  fetch(`http://localhost:5000/api/silver-changes?date=${date}`)
    .then(res => res.json())
    .then(data => {
      const changesObj = data.changes || {};
      setChanges(changesObj);
      
    })
    .catch(err => console.error("Changes fetch error:", err));
}, [date]);


  const makeSignature = (l) =>
  `${l.unit_id}|${l.title.toLowerCase()}|${l.unit_name.toLowerCase()}|${l.beds}|${l.baths}|${l.sqft}`;


  const getBadge = (sig) => {
  const change = changes?.[sig];
  if (!change) return null;

  // ✅ Only process if delta is a DROP (delta < 0)
  if (change.change === "changed" && change.delta < 0) {
    const delta = change.delta;
    return {
      emoji: "↓",
      delta: Math.abs(delta), // still display as positive number
      className:
        Math.abs(delta) >= 10
          ? "bg-red-600 text-white"
          : "bg-red-100 text-red-700",
    };
  }

  return null; // skip if delta >= 0 or not a price drop
};




  const movers = listings
  .map((l) => {
    const sig = makeSignature(l);
    const badge = getBadge(sig);
    return badge ? { ...l, badge } : null;
  })
  .filter(Boolean)
  .sort((a, b) => b.badge.delta - a.badge.delta)
  .slice(0, 3); // Limit to top 3 price drops



  if (movers.length === 0) return <p className="text-sm text-zinc-500">No movers today.</p>;

return (
  <div className="overflow-x-auto max-h-[220px]">
    <table className="min-w-full text-sm text-left text-zinc-900">
      <thead>
        <tr className="text-sm font-medium text-zinc-700 border-b">
          <th className="px-3 py-2">Building</th>
          <th className="px-3 py-2 text-center">Price</th>
          <th className="px-3 py-2 text-center">Change</th>
          <th className="px-3 py-2 text-center">Beds</th>
          <th className="px-3 py-2 text-center">Baths</th>
          <th className="px-3 py-2 text-center">Unit ID</th>
        </tr>
      </thead>
      <tbody>
        {movers.map((listing) => {
          const sig = makeSignature(listing);
          return (
            <tr
              key={listing.unit_id + listing.scrape_date}
              className="border-t hover:bg-zinc-50 even:bg-zinc-50 transition"
            >
              <td className="px-3 py-2">
                <a
                  href={listing.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {listing.title}
                </a>
              </td>
              <td className="px-3 py-2 text-center">${listing.price}</td>
              <td className="px-3 py-2 text-center">
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  ↓ ${listing.badge.delta}
                  {listing.badge.delta > 100 ? " 🔥" : ""}
                </span>
              </td>
              <td className="px-3 py-2 text-center">{listing.beds}</td>
              <td className="px-3 py-2 text-center">{listing.baths}</td>
              <td className="px-3 py-2 text-center">{listing.unit_id}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);



}
