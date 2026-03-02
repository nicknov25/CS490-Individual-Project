 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TopFilm = {
  film_id: number;
  title: string;
  description?: string;
  rentals?: number;
};

type TopActor = {
  actor_id: number;
  first_name: string;
  last_name: string;
  rentals?: number;
};

type FilmDetails = {
  film_id: number;
  title: string;
  description?: string;
  release_year?: number;
  rating?: string;
  category?: string;
  actors?: { actor_id: number; first_name: string; last_name: string }[];
};

type ActorDetails = {
  actor_id: number;
  first_name: string;
  last_name: string;
  top_films?: { film_id: number; title: string; rentals?: number }[];
};

const API_BASE = "/api";

export default function Home() {
  const [topFilms, setTopFilms] = useState<TopFilm[]>([]);
  const [topActors, setTopActors] = useState<TopActor[]>([]);
  const [selectedFilm, setSelectedFilm] = useState<FilmDetails | null>(null);
  const [selectedActor, setSelectedActor] = useState<ActorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/top_rented_films`).then((r) => r.json()),
      fetch(`${API_BASE}/top_actors`).then((r) => r.json()),
    ])
      .then(([filmsData, actorsData]) => {
        setTopFilms(Array.isArray(filmsData) ? filmsData : []);
        setTopActors(Array.isArray(actorsData) ? actorsData : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching top lists:", err);
        setError("Failed to load top lists.");
        setLoading(false);
      });
  }, []);

  const handleFilmClick = async (filmId: number) => {
    try {
      const res = await fetch(`${API_BASE}/film/${filmId}`);
      const data = await res.json();
      setSelectedFilm(data.film ? { ...data.film, actors: data.actors } : null);
      setSelectedActor(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActorClick = async (actorId: number) => {
    try {
      const res = await fetch(`${API_BASE}/actor/${actorId}`);
      const data = await res.json();
      setSelectedActor(data.actor ? { ...data.actor, top_films: data.top_films } : null);
      setSelectedFilm(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <header className="page-header relative flex items-center justify-center">
        <h1 className="page-title">
          <Link href="/pages/films">Movies</Link>
        </h1>
        <Link
          href="/pages/customers"
          className="absolute right-6 border border-white text-white hover:bg-black hover:text-white font-semibold py-2 px-4 rounded transition"
        >
          Customers
        </Link>
      </header>

      <main className="p-8">
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <section>
              <h2 className="font-bold mb-2">Top 5 Rented Films</h2>
              <div className="space-y-2">
                {topFilms.map((film) => (
                  <button
                    key={film.film_id}
                    type="button"
                    className="w-full text-left p-3 bg-white text-black rounded shadow hover:bg-zinc-50"
                    onClick={() => handleFilmClick(film.film_id)}
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold">{film.title}</span>
                      <span className="text-sm text-gray-500">{film.rentals ?? 0} rentals</span>
                    </div>
                    {film.description && (
                      <p className="text-sm text-gray-600">{film.description}</p>
                    )}
                  </button>
                ))}
                {topFilms.length === 0 && <div className="text-gray-500">No data</div>}
              </div>
            </section>

            <section>
              <h2 className="font-bold mb-2">Top 5 Actors (Store)</h2>
              <div className="space-y-2">
                {topActors.map((actor) => (
                  <button
                    key={actor.actor_id}
                    type="button"
                    className="w-full text-left p-3 bg-white text-black rounded shadow hover:bg-zinc-50"
                    onClick={() => handleActorClick(actor.actor_id)}
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {actor.first_name} {actor.last_name}
                      </span>
                      <span className="text-sm text-gray-500">{actor.rentals ?? 0} rentals</span>
                    </div>
                  </button>
                ))}
                {topActors.length === 0 && <div className="text-gray-500">No data</div>}
              </div>
            </section>

            <section>
              <h2 className="font-bold mb-2">Details</h2>
              <div className="p-4 bg-white text-black rounded shadow h-[420px] overflow-auto">
                {selectedFilm ? (
                  <div>
                    <h3 className="text-xl font-bold mb-2">{selectedFilm.title}</h3>
                    <div className="text-sm text-gray-600 mb-2">
                      {selectedFilm.category} • {selectedFilm.release_year} • {selectedFilm.rating}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{selectedFilm.description}</p>
                    <h4 className="font-semibold">Actors</h4>
                    <ul className="list-disc ml-5 text-sm text-gray-700">
                      {(selectedFilm.actors || []).map((a) => (
                        <li key={a.actor_id}>
                          {a.first_name} {a.last_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : selectedActor ? (
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {selectedActor.first_name} {selectedActor.last_name}
                    </h3>
                    <h4 className="font-semibold">Top 5 Rented Films</h4>
                    <ul className="list-disc ml-5 text-sm text-gray-700">
                      {(selectedActor.top_films || []).map((f) => (
                        <li key={f.film_id}>
                          {f.title} ({f.rentals ?? 0} rentals)
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-gray-500">Click a film or actor to view details.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
