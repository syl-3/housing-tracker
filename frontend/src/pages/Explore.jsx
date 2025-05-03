import { useState, useEffect, useMemo, useRef } from "react";

export default function Explore() {
  const [listings, setListings] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceTimer = useRef(null);

  const [priceChanges, setPriceChanges] = useState({
    changes: {},
    latest_date: "",
    previous_date: ""
  });

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(searchInput.toLowerCase());
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  useEffect(() => {
    fetch("http://localhost:5000/api/scrape-dates")
      .then(res => res.json())
      .then(data => {
        setDates(data);
        setSelectedDate(data[0]);
      })
      .catch(err => console.error("Error fetching scrape dates:", err));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    fetch(`http://localhost:5000/api/silver-by-date/${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        const sorted = [...data].filter(d => d.price != null).sort((a, b) => b.price - a.price);
        setListings(sorted);
      })
      .catch(err => console.error("Error loading listings:", err));

    fetch(`http://localhost:5000/api/silver-changes?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        setPriceChanges(data);
        console.log("✅ Loaded priceChanges keys:", Object.keys(data.changes).slice(0, 5));
      })
      .catch(err => console.error("Error fetching price changes:", err));
  }, [selectedDate]);

  const getPriceBadge = (listing) => {
    const normalize = (val) => {
      if (val == null) return "";
      if (typeof val === "number") return val % 1 === 0 ? String(val) : val.toFixed(1);
      return val.toString().trim().toLowerCase();
    };

    const signature = [
      normalize(listing.unit_id),
      normalize(listing.title?.toLowerCase()),      // normalize title to lowercase
      normalize(listing.unit_name?.toLowerCase()),  // normalize unit_name to lowercase
      normalize(listing.beds),
      normalize(listing.baths),
      normalize(listing.sqft)
    ].join("|");

    const changeData = priceChanges?.changes?.[signature];
    console.log("🔍 Signature:", signature);
    console.log("🔎 Match:", priceChanges?.changes?.hasOwnProperty(signature));

    if (!changeData) return null;

    if (changeData.change === "new") {
      return (
        <span className="ml-2 inline-block text-xs text-blue-700 bg-blue-100 rounded px-2 py-0.5">
          New
        </span>
      );
    }

    if (changeData.change === "changed") {
      const delta = changeData.delta;
      const isDrop = delta < 0;
      const color = isDrop ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";

      return (
        <span className={`ml-2 inline-block text-xs ${color} rounded px-2 py-0.5`}>
          {isDrop ? "⬇️" : "🔺"} ${Math.abs(delta)}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-3xl font-semibold">Explore Listings</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
          <div>
            <label htmlFor="dateSelect" className="mr-2 font-medium text-zinc-700">
              Scrape Date:
            </label>
            <select
              id="dateSelect"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {dates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Search listings..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full sm:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto shadow rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm text-left text-zinc-800">
          <thead className="bg-gray-100 text-xs uppercase tracking-wider text-zinc-600">
            <tr>
              <th className="px-4 py-3">Building</th>
              <th className="px-4 py-3">Unit Type</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Beds</th>
              <th className="px-4 py-3">Baths</th>
              <th className="px-4 py-3">Sqft</th>
              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">Neighborhood</th>
            </tr>
          </thead>
          <tbody>
            {listings
              .filter(listing => {
                const term = searchTerm.toLowerCase();
                return (
                  listing.title?.toLowerCase().includes(term) ||
                  listing.unit_name?.toLowerCase().includes(term) ||
                  listing.zipcode?.toString().includes(term) ||
                  listing.neighborhood?.toLowerCase().includes(term)
                );
              })
              .map(listing => {
                console.log("👀 Trying badge for:", {
                  unit_id: listing.unit_id,
                  title: listing.title,
                  unit_name: listing.unit_name,
                  beds: listing.beds,
                  baths: listing.baths,
                  sqft: listing.sqft,
                  price: listing.price
                });

                return (
                  <tr key={listing.unit_id + listing.scrape_date} className="border-t hover:bg-zinc-50">
                    <td className="px-4 py-2">
                      <a
                        href={listing.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {listing.title}
                      </a>
                    </td>
                    <td className="px-4 py-2">{listing.unit_name || "-"}</td>
                    <td className="px-4 py-2">{listing.unit_id}</td>
                    <td className="px-4 py-2">
                      ${listing.price}
                      {getPriceBadge(listing)}
                    </td>
                    <td className="px-4 py-2">{listing.beds}</td>
                    <td className="px-4 py-2">{listing.baths}</td>
                    <td className="px-4 py-2">{listing.sqft}</td>
                    <td className="px-4 py-2">{listing.zipcode}</td>
                    <td className="px-4 py-2">{listing.neighborhood}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
