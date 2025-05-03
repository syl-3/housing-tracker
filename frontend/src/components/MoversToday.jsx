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

  const makeSignature = (l) =>
    `${l.listing_url}|${l.unit_name}|${l.beds}|${l.baths}|${l.sqft}`;

  const getBadge = (sig) => {
    const change = changes?.[sig];
    if (!change) return null;
    if (change.change === "new") return "🆕 New";
    if (change.change === "changed") {
      const delta = change.delta;
      return delta < 0 ? `🔻 $${Math.abs(delta)}` : `🔺 $${Math.abs(delta)}`;
    }
    return null;
  };

  const movers = listings.filter((l) => getBadge(makeSignature(l)));

  if (movers.length === 0) return <p className="text-sm text-zinc-500">No movers today.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left text-zinc-900">
        <thead className="bg-zinc-100 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Price</th>
            <th className="px-4 py-2">Change</th>
            <th className="px-4 py-2">Beds</th>
            <th className="px-4 py-2">Neighborhood</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((listing) => {
            const sig = makeSignature(listing);
            return (
              <tr key={listing.unit_id + listing.scrape_date} className="border-t">
                <td className="px-4 py-2">
                  <a
                    href={listing.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-700 hover:underline"
                  >
                    {listing.title}
                  </a>
                </td>
                <td className="px-4 py-2">${listing.price}</td>
                <td className="px-4 py-2">{getBadge(sig)}</td>
                <td className="px-4 py-2">{listing.beds}</td>
                <td className="px-4 py-2">{listing.neighborhood}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
