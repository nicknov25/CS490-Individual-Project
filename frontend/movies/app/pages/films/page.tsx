"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Film {
  film_id: number;
  title: string;
  description: string;
  release_year: number;
  rating: string;
  category: string;
  rental_rate: number;
  length: number;
}

export default function FilmsPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("title");
  const [films, setFilms] = useState<Film[]>([]);
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);
  const [customerId, setCustomerId] = useState(""); // Simple input for customer ID
  const [message, setMessage] = useState("");

  // Search function
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:5000/api/films?q=${query}&type=${searchType}`);
    const data = await res.json();
    setFilms(data);
    setSelectedFilm(null); // Clear selection on new search
  };

  // Rent function
  const handleRent = async () => {
    if (!selectedFilm || !customerId) {
      setMessage("Please enter a valid Customer ID.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          film_id: selectedFilm.film_id,
          customer_id: customerId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Success! Rented "${selectedFilm.title}" (Inventory ID: ${data.inventory_id})`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("Failed to connect to server.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">Sakila Video Rental</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/pages/customers"
            className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold py-2 px-4 rounded transition"
          >
            Customers
          </Link>
          <Link
            href="/"
            className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold py-2 px-4 rounded transition"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* --- SEARCH SECTION --- */}
      <form onSubmit={handleSearch} className="flex gap-4 mb-8 bg-gray-800 p-4 rounded-lg">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600"
        >
          <option value="title">Film Title</option>
          <option value="actor">Actor Name</option>
          <option value="genre">Genre</option>
        </select>
        
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600 placeholder-gray-400"
        />
        
        <button 
          type="submit" 
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded transition"
        >
          Search
        </button>
      </form>

      <div className="flex gap-8">
        {/* --- RESULTS LIST --- */}
        <div className="w-1/2">
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Search Results</h2>
          <div className="space-y-2 h-[600px] overflow-y-auto pr-2">
            {films.map((film) => (
              <div
                key={film.film_id}
                onClick={() => { setSelectedFilm(film); setMessage(""); }}
                className={`p-4 rounded cursor-pointer transition border ${
                  selectedFilm?.film_id === film.film_id
                    ? "bg-blue-900 border-blue-500"
                    : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{film.title}</span>
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded">{film.category}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {film.release_year} | {film.rating}
                </div>
              </div>
            ))}
            {films.length === 0 && <p className="text-gray-500 italic">No films found.</p>}
          </div>
        </div>

        {/* --- DETAILS & RENTAL PANEL --- */}
        <div className="w-1/2 bg-gray-800 p-6 rounded-lg border border-gray-700 h-fit sticky top-8">
          {selectedFilm ? (
            <>
              <h2 className="text-2xl font-bold mb-2">{selectedFilm.title}</h2>
              <div className="flex gap-2 mb-4">
                 <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-sm font-bold">{selectedFilm.rating}</span>
                 <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm">{selectedFilm.category}</span>
                 <span className="text-gray-400 text-sm py-0.5">{selectedFilm.length} min</span>
              </div>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                {selectedFilm.description}
              </p>

              <div className="border-t border-gray-600 pt-6">
                <h3 className="text-lg font-semibold mb-3 text-green-400">Rent this Movie</h3>
                
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Customer ID</label>
                  <input
                    type="number"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    placeholder="Enter Customer ID (e.g. 1)"
                  />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">${selectedFilm.rental_rate}</span>
                    <button
                        onClick={handleRent}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition"
                    >
                        Confirm Rental
                    </button>
                </div>
                
                {message && (
                  <div className={`mt-4 p-3 rounded text-center ${message.includes("Error") ? "bg-red-900/50 text-red-200" : "bg-green-900/50 text-green-200"}`}>
                    {message}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
              <p>Select a film to view details and rent.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
