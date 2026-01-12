import { createSignal, Show, For, createEffect } from "solid-js";
import { isAuthenticated, authService } from "../services/auth.js";
import { db } from "../lib/firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

const CATEGORIES = [
  { value: "All", label: "Svi" },
  { value: "Sports", label: "Sport" },
  { value: "Music", label: "Glazba" },
  { value: "Social", label: "Druženje" },
  { value: "Other", label: "Ostalo" }
];

export default function Home() {
  const [events, setEvents] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [favorites, setFavorites] = createSignal([]);
  const [selectedCategory, setSelectedCategory] = createSignal("All");

  const loadEvents = async () => {
    setLoading(true);
    try {
      const eventsRef = collection(db, "events");

      let q = query(eventsRef, where("isPrivate", "==", false));

      // filtriranje po kategoriji ako nije "All"
      if (selectedCategory() !== "All") {
        q = query(q, where("category", "==", selectedCategory()));
      }

      const snapshot = await getDocs(q);
      const loadedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setEvents(loadedEvents);

      // učitavanje korisnikovih favorita (samo ako je prijavljen)
      if (isAuthenticated()) {
        const userId = authService.getCurrentUser().uid;
        const userFavs = loadedEvents
          .filter((event) => event.favorites?.includes(userId))
          .map((event) => event.id);
        setFavorites(userFavs);
      }
    } catch (error) {
      console.error("Event load failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ponovno učitavanje kad se promijeni kategorija
  createEffect(() => {
    if (isAuthenticated()) {
      loadEvents();
    }
  });

  // ovisnost i na promjenu selectedCategory
  createEffect(() => {
    selectedCategory(); // samo da bi se efekt pokrenuo
    if (isAuthenticated()) {
      loadEvents();
    }
  });

  const toggleFavorite = async (eventId) => {
    if (!isAuthenticated()) return;
    const userId = authService.getCurrentUser().uid;
    const isFavorite = favorites().includes(eventId);

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        favorites: isFavorite ? arrayRemove(userId) : arrayUnion(userId)
      });

      setFavorites(
        isFavorite
          ? favorites().filter((id) => id !== eventId)
          : [...favorites(), eventId]
      );

      setEvents(
        events().map((event) =>
          event.id === eventId
            ? {
                ...event,
                favorites: isFavorite
                  ? (event.favorites || []).filter((id) => id !== userId)
                  : [...(event.favorites || []), userId]
              }
            : event
        )
      );
    } catch (error) {
      console.error("Error toggling favorite", error.message);
    }
  };

  const formatEventDate = (datetime) => {
    if (!datetime) return "Nije zadan datum";
    const date = datetime.toDate ? datetime.toDate() : new Date(datetime);
    return date.toLocaleString("hr-HR", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case "Sports": return "badge badge-info badge-outline";
      case "Music":  return "badge badge-secondary badge-outline";
      case "Social": return "badge badge-success badge-outline";
      case "Other":  return "badge badge-neutral badge-outline";
      default:       return "badge badge-ghost";
    }
  };

  return (
    <>
      <h1 class="text-2xl uppercase tracking-wider mb-6 w-full text-center">
        Javni događaji
      </h1>

      <Show when={isAuthenticated()}>
        {/* Filter po kategoriji */}
        <div class="max-w-4xl mx-auto mb-6 flex flex-wrap justify-center gap-2">
          <For each={CATEGORIES}>
            {(cat) => (
              <button
                type="button"
                class={`btn btn-sm ${selectedCategory() === cat.value ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </button>
            )}
          </For>
        </div>

        <Show when={loading()}>
          <div class="flex justify-center my-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        </Show>

        <Show when={!loading() && events().length === 0}>
          <div class="alert alert-info max-w-2xl mx-auto">
            <span>Nema javnih događaja u ovoj kategoriji.</span>
          </div>
        </Show>

        <Show when={!loading() && events().length > 0}>
          <div class="max-w-4xl m-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={events()}>
              {(event) => (
                <div class="card bg-base-200 shadow-md hover:shadow-lg transition-shadow">
                  <div class="card-body">
                    <div class="flex justify-between items-start gap-2">
                      <h3 class="card-title text-lg">{event.name}</h3>
                      <button
                        class="btn btn-ghost btn-circle btn-sm shrink-0"
                        onClick={() => toggleFavorite(event.id)}
                        title={favorites().includes(event.id) ? "Izbaci iz omiljenih" : "Dodaj u omiljene"}
                      >
                        {favorites().includes(event.id) ? "💙" : "🤍"}
                      </button>
                    </div>

                    <div class="flex flex-wrap gap-2 mt-1">
                      <div class={getCategoryBadgeClass(event.category)}>
                        {event.category || "Ostalo"}
                      </div>
                      {event.isPrivate && (
                        <div class="badge badge-warning badge-outline">Privatno</div>
                      )}
                    </div>

                    <p class="text-sm mt-3 line-clamp-3">{event.description}</p>

                    <p class="text-xs text-gray-600 mt-3">
                      {formatEventDate(event.datetime)}
                    </p>

                    <Show when={event.favorites?.length > 0}>
                      <p class="text-xs text-gray-500 mt-1">
                        💙 {event.favorites.length}
                      </p>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={!isAuthenticated()}>
        <p class="text-center text-gray-600 mt-8">
          Prijavite se kako biste vidjeli javne događaje
        </p>
      </Show>
    </>
  );
}