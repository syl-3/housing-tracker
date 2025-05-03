import { useState, useEffect, useMemo, useRef } from "react";
import { saveAs } from "file-saver";

export default function Explore() {
  const [listings, setListings] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceTimer = useRef(null);
  const [searchField, setSearchField] = useState("title");
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyMovers, setShowOnlyMovers] = useState(false);

  const [priceChanges, setPriceChanges] = useState({
    changes: {},
    latest_date: "",
    previous_date: ""
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const generateSignature = (listing) => {
  const normalize = (val) => {
    if (val == null) return "";
    if (typeof val === "number") {
      return val % 1 === 0 ? String(val) : val.toFixed(1).replace(/\.0$/, "");
    }
    return val.toString().trim().toLowerCase();
  };


  return [
    normalize(listing.unit_id),
    normalize(listing.title),
    normalize(listing.unit_name),
    normalize(listing.beds),
    normalize(listing.baths),
    normalize(listing.sqft)
  ].join("|");
};

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: null, direction: null }; // Reset
      }
      return { key, direction: "asc" };
    });
  };

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

    

    const signature = generateSignature(listing);


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
          {isDrop ? "↓" : "↑"} ${Math.abs(delta)}
        </span>
      );
    }

    return null;
  };

  const downloadCSV = () => {
  const headers = [
    "Building",
    "Unit Type",
    "Unit ID",
    "Price",
    "Beds",
    "Baths",
    "Sqft",
    "ZIP",
    "Neighborhood",
    "Listing URL"
  ];

  const rows = listings
    .filter(listing => {
      const val = listing[searchField];
      if (val == null) return false;

      const fieldVal = typeof val === "number" ? String(val) : val.toString().toLowerCase();


      if (!fieldVal.includes(searchTerm)) return false;

  const signature = generateSignature(listing);
  const changeData = priceChanges?.changes?.[signature];

  if (showOnlyNew && changeData?.change !== "new") return false;

  if (showOnlyMovers && changeData?.change !== "changed") return false;

  

  return true;
    })
    .sort((a, b) => {
      if (showOnlyMovers) {
    const getDelta = (listing) => {
      const sig = generateSignature(listing);
      const data = priceChanges?.changes?.[sig];
      return data?.delta ?? 0;
    };
    return getDelta(a) - getDelta(b); // Drops first (negative)
  }

  const { key, direction } = sortConfig;
  if (!key || direction === null) return 0;

  const aVal = a[key] ?? 0;
  const bVal = b[key] ?? 0;
  return direction === "asc" ? aVal - bVal : bVal - aVal;

    })
    .map(l => [
      l.title,
      l.unit_name,
      l.unit_id,
      l.price,
      l.beds,
      l.baths,
      l.sqft,
      l.zipcode,
      l.neighborhood,
      l.listing_url
    ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell ?? ""}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const fileName = `redwing_listings_${selectedDate}.csv`;
  saveAs(blob, fileName);
};
  
  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
  <h2 className="text-3xl font-semibold">Explore Listings</h2>

  <div className="flex flex-col sm:flex-row items-center gap-3 text-sm">
    {/* New / Movers */}
    <div className="flex items-center gap-3">
      <span className="font-medium text-zinc-700">Show only:</span>
      <label className="inline-flex items-center gap-1 text-zinc-700">
        <input
          type="checkbox"
          checked={showOnlyNew}
          onChange={() => setShowOnlyNew(!showOnlyNew)}
          className="accent-red-600 align-middle"
        />
        New
      </label>
      <label className="inline-flex items-center gap-1 text-zinc-700">
        <input
          type="checkbox"
          checked={showOnlyMovers}
          onChange={() => setShowOnlyMovers(!showOnlyMovers)}
          className="accent-red-600 align-middle"
        />
        Movers
      </label>
    </div>

    {/* Divider 1 */}
    <div className="hidden sm:block w-[2px] h-6 bg-zinc-300" />

    {/* Scrape Date + CSV */}
    <div className="flex items-center gap-2">
      <label htmlFor="dateSelect" className="font-medium text-zinc-700">
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
      <button
        onClick={downloadCSV}
        className="border border-zinc-700 rounded px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-500 transition"
      >
        Download as CSV
      </button>
    </div>

    {/* Divider 2 */}
    <div className="hidden sm:block w-[1.5px] h-6 bg-zinc-300" />

    {/* Search by + box */}
    <div className="flex items-center gap-2">
      <label htmlFor="searchField" className="font-medium text-zinc-700">
        Search by:
      </label>
      <select
        id="searchField"
        value={searchField}
        onChange={(e) => setSearchField(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="title">Building</option>
        <option value="unit_name">Unit Type</option>
        <option value="unit_id">Unit ID</option>
        <option value="price">Price</option>
        <option value="beds">Beds</option>
        <option value="baths">Baths</option>
        <option value="sqft">Sqft</option>
        <option value="zipcode">ZIP Code</option>
        <option value="neighborhood">Neighborhood</option>
      </select>
      <input
        type="text"
        placeholder="Search listings..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-full sm:w-64"
      />
    </div>
  </div>



      </div>

      <div className="overflow-x-auto shadow rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm text-left text-zinc-800">
          <thead className="bg-gray-100 text-xs uppercase tracking-wider text-zinc-600">
            <tr>
              <th className="px-4 py-3">Building</th>
              <th className="px-4 py-3">Unit Type</th>
              <th className="px-4 py-3">Unit</th>
              <th
  className="px-4 py-3 cursor-pointer select-none"
  onClick={() => handleSort("price")}
>
  Price{" "}
  {sortConfig.key === "price" ? (
    sortConfig.direction === "asc" ? "▲" :
    sortConfig.direction === "desc" ? "▼" :
    "⇅"
  ) : "⇅"}
</th>


              <th
  className="px-4 py-3 cursor-pointer select-none"
  onClick={() => handleSort("beds")}
>
  Beds{" "}
  {sortConfig.key === "beds" ? (
    sortConfig.direction === "asc" ? "▲" :
    sortConfig.direction === "desc" ? "▼" :
    "⇅"
  ) : "⇅"}
</th>


              <th
  className="px-4 py-3 cursor-pointer select-none"
  onClick={() => handleSort("baths")}
>
  Baths{" "}
  {sortConfig.key === "baths" ? (
    sortConfig.direction === "asc" ? "▲" :
    sortConfig.direction === "desc" ? "▼" :
    "⇅"
  ) : "⇅"}
</th>


              <th
  className="px-4 py-3 cursor-pointer select-none"
  onClick={() => handleSort("sqft")}
>
  Sqft{" "}
  {sortConfig.key === "sqft" ? (
    sortConfig.direction === "asc" ? "▲" :
    sortConfig.direction === "desc" ? "▼" :
    "⇅"
  ) : "⇅"}
</th>


              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">Neighborhood</th>
            </tr>
          </thead>
          <tbody>
            {listings
              .filter(listing => {
  const val = listing[searchField];
  if (val == null) return false;

  const fieldVal = typeof val === "number" ? String(val) : val.toString().toLowerCase();
  if (!fieldVal.includes(searchTerm)) return false;

  const signature = generateSignature(listing);
  const changeData = priceChanges?.changes?.[signature];

  if (showOnlyNew && changeData?.change !== "new") return false;
  if (showOnlyMovers && changeData?.change !== "changed") return false;

  return true;
})


              
              .sort((a, b) => {
  const { key, direction } = sortConfig;
  if (!key || direction === null) return 0;

  const aVal = a[key] ?? 0;
  const bVal = b[key] ?? 0;

  if (direction === "asc") return aVal - bVal;
  if (direction === "desc") return bVal - aVal;
  return 0;
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
