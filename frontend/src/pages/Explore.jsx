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
  const [isLoading, setIsLoading] = useState(false);

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
    fetch("/api/scrape-dates")
      .then(res => res.json())
      .then(data => {
        setDates(data);
        setSelectedDate(data[0]);
      })
      .catch(err => console.error("Error fetching scrape dates:", err));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    fetch(`/api/silver-by-date/${selectedDate}`)
      .then(res => res.json())
      .then(data => {
  const filtered = data.filter(d => d.price != null);
  setListings(filtered);
})

      .catch(err => console.error("Error loading listings:", err));

    fetch(`/api/silver-changes?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        setPriceChanges(data);
        
      })
      .catch(err => console.error("Error fetching price changes:", err));
  }, [selectedDate]);

  



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

const filteredListings = useMemo(() => {
  return listings
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

      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });
}, [listings, searchField, searchTerm, sortConfig, showOnlyNew, showOnlyMovers, priceChanges]);

const [currentPage, setCurrentPage] = useState(1);
const listingsPerPage = 25;

const paginatedListings = useMemo(() => {
  const start = (currentPage - 1) * listingsPerPage;
  return filteredListings.slice(start, start + listingsPerPage);
}, [filteredListings, currentPage]);

const totalPages = Math.ceil(filteredListings.length / listingsPerPage);



const priceBadges = useMemo(() => {
  const map = new Map();

  filteredListings.forEach(listing => {
    const signature = generateSignature(listing);
    const changeData = priceChanges?.changes?.[signature];

    if (!changeData) return;

    let badge = null;

    if (changeData.change === "new") {
      badge = (
  <span className="ml-2 inline-block min-w-[2rem] text-xs text-center text-blue-700 bg-blue-100 rounded px-2 py-0.5">
    New
  </span>
);

    } else if (changeData.change === "changed") {
      const delta = changeData.delta;
      const isDrop = delta < 0;
      const color = isDrop ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";

      badge = (
        <span className={`ml-2 inline-block min-w-[2rem] text-xs ${color} rounded px-2 py-0.5 text-center`}>
  {isDrop ? "↓" : "↑"} ${Math.abs(delta)}
</span>

      );
    }

    map.set(signature, badge);
  });

  return map;
}, [filteredListings, priceChanges]);

useEffect(() => {
  const startDelay = setTimeout(() => {
    setIsLoading(true);
    const endDelay = setTimeout(() => {
      setIsLoading(false);
    }, 600); // shimmer lasts 400ms
    return () => clearTimeout(endDelay);
  }, 1); // debounce the shimmer start just a touch

  return () => clearTimeout(startDelay);
}, [filteredListings]);

// Reset to Page 1 on any input/filter/sort/scrapeDate change
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, searchField, showOnlyNew, showOnlyMovers, sortConfig, selectedDate]);


  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
  <h2 className="text-3xl font-semibold"></h2>

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
          className="accent-zinc-900 align-middle"
        />
        Movers
      </label>
    </div>

    {/* Divider 1 */}
    <div className="hidden sm:block w-[1.5px] h-6 bg-zinc-300" />

    {/* Scrape Date + CSV */}
    <div className="flex items-center gap-2">
      <label htmlFor="dateSelect" className="font-medium text-zinc-700">
        Scrape Date:
      </label>
      <select
        id="dateSelect"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="border rounded px-2 py-1 text-sm cursor-pointer hover:bg-zinc-200 transition"
      >
        {dates.map(date => (
          <option key={date} value={date}>{date}</option>
        ))}
      </select>
      <button
        onClick={downloadCSV}
        className="border border-zinc-700 rounded px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-200 hover:border-zinc-500 transition cursor-pointer"
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
        className="border rounded px-2 py-1 text-sm cursor-pointer hover:bg-zinc-200 transition" >
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
        placeholder={`Search ${filteredListings.length.toLocaleString()} active listings...`}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-full sm:w-64 bg-zinc-50 hover:bg-zinc-200 transition cursor-text placeholder:text-zinc-400"
      />
    </div>
  </div>



      </div>
      
    <div style={{ willChange: "opacity" }} 
    className={`transition-opacity duration-500 ${isLoading ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
      <div className="relative overflow-x-auto shadow rounded-lg border border-gray-200 bg-white flex">
    <table className="min-w-full table-fixed text-sm text-left text-zinc-800">
          <thead className="bg-gray-100 text-xs uppercase tracking-wider text-zinc-600">
  <tr>
    <th className="w-[14rem] px-4 py-3 text-left">Building</th>
    <th className="w-[10rem] px-4 py-3 text-center">Unit Type</th>
    <th className="w-[8rem] px-4 py-3 text-center">Unit</th>
    <th className="w-[8.5rem] px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort("price")}>
      Price {sortConfig.key === "price" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅"}
    </th>
    <th className="w-[6rem] px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort("beds")}>
      Beds {sortConfig.key === "beds" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅"}
    </th>
    <th className="w-[6rem] px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort("baths")}>
      Baths {sortConfig.key === "baths" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅"}
    </th>
    <th className="w-[6rem] px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort("sqft")}>
      Sqft {sortConfig.key === "sqft" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅"}
    </th>
    <th className="w-[7rem] px-4 py-3 text-center">ZIP</th>
    <th className="w-[14rem] px-4 py-3 text-center">Neighborhood</th>
  </tr>
</thead>




          <tbody>
              {paginatedListings.map(listing => {



                

                return (
                  <tr key={listing.unit_id + listing.scrape_date} className="border-t hover:bg-zinc-100">
  <td className="w-[14rem] px-4 py-3 truncate text-sm text-zinc-700 text-left">
    <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {listing.title}
    </a>
  </td>
  <td className="w-[10rem] px-4 py-3 truncate text-sm text-zinc-700 text-center">{listing.unit_name || "-"}</td>
  <td className="w-[8rem] px-4 py-3 truncate text-sm text-zinc-700 text-center">{listing.unit_id}</td>
  <td className="w-[7rem] px-4 py-3 text-sm text-zinc-700 text-center relative">
  <span className="block">${listing.price}</span>
  {priceBadges.get(generateSignature(listing)) && (
    <span className="absolute top-1/2 -translate-y-1/2 right-1">
      {priceBadges.get(generateSignature(listing))}
    </span>
  )}
</td>





  <td className="w-[6rem] px-4 py-3 text-sm text-zinc-700 text-center">{listing.beds}</td>
  <td className="w-[6rem] px-4 py-3 text-sm text-zinc-700 text-center">{listing.baths}</td>
  <td className="w-[6rem] px-4 py-3 text-sm text-zinc-700 text-center">{listing.sqft}</td>
  <td className="w-[7rem] px-4 py-3 text-sm text-zinc-700 text-center">{listing.zipcode}</td>
  <td className="w-[14rem] px-4 py-3 truncate text-sm text-zinc-700 text-center">{listing.neighborhood}</td>
</tr>



                  
                );
              })}
              

          </tbody>
        
  
        </table>



        </div>

        
        
        {/* Sticky Bottom Pagination Bar */}
{totalPages > 1 && (
  <div className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t-1 border-black-200 px-6 py-3 flex justify-between items-center shadow-md z-20">
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className="px-4 py-2 border rounded text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      ← Prev
    </button>

    <span className="text-sm text-zinc-900">
      Page {currentPage} of {totalPages}
    </span>

    <button
      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
      disabled={currentPage === totalPages}
      className="px-4 py-2 border rounded text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      Next →
    </button>
  </div>
)}

</div>
    </div>
  );
}
