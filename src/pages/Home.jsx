import { createSignal, Show, For, createEffect } from "solid-js";
import { isAuthenticated, authService } from "../services/auth.js";
import { db } from "../lib/firebase.js";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function Home() {
    const [events, setEvents] = createSignal([]);
    const [loading, setLoading] = createSignal(false);
    const [favorites, setFavorites] = createSignal([]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, where("isPrivate", "==", false));
            const snapshot = await getDocs(q);
            setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

            // učitavanje korisnikovih favorita
            if (isAuthenticated()) {
                const userId = authService.getCurrentUser().uid;
                const userFavs = snapshot.docs
                    .filter(doc => doc.data().favorites?.includes(userId))
                    .map(doc => doc.id);
                setFavorites(userFavs);
            }
        } catch (error) {
            console.error("Event load failed", error.message);
        } finally {
            setLoading(false);
        }
    }

    const toggleFavorite = async (eventId) => {
        if (!isAuthenticated()) return;

        const userId = authService.getCurrentUser().uid;
        const isFavorite = favorites().includes(eventId);

        try {
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef,
                { favorites: isFavorite ? arrayRemove(userId) : arrayUnion(userId) }
            );
            setFavorites(isFavorite
                ? favorites().filter(id => id !== eventId)
                : [...favorites(), eventId]
            );
            // ažuriramo stanje polja "favorites" - popis korisnika kojima je događaj označen
            setEvents(events().map(event =>
                event.id === eventId // u postojećem popisu događaj tražimo ciljani događaj
                    ? { // našli smo ciljani događaj, ažuriramo ga
                        ...event, favorites: isFavorite // uzimamo stare podatke događaja i ažuriramo polje "favorites"
                            ? (event.favorites || []).filter(id => id !== userId) // ako je događaj prije bio u "favorites" sada ga izbacujemo
                            : [...(event.favorites || []), userId] // ako događaj nije bio u "favorites" sada ga dodajemo
                    }
                    : event // događaj koji nije ciljani ne diramo, ostavljamo takvim kakav jest
            ));
        } catch (error) {
            console.error("Error toggling favorite", error.message);
        }
    }

    // pomoćna funkcija za oblikovanje datuma
    const formatEventDate = (datetime) => {
        if (!datetime) return "Nije zadan datum";
        if (datetime.toDate) return datetime.toDate().toLocaleString();
        if (datetime.toLocaleString) return datetime.toLocaleString();
        return "Nije zadan datum";
    }

    createEffect(async () => {
        if (isAuthenticated()) {
            await loadEvents();
        }
    });

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-4 w-full text-center">Dobro došli na naslovnicu</h1>

            <Show when={!isAuthenticated()}>
                <p class="text-center text-gray-600">Prijavite se kako biste vidjeli događaje</p>
            </Show>

            <Show when={isAuthenticated()}>
                <Show when={loading()}>
                    <div class="flex justify-center">
                        <span class="loading loading-spinner loading-lg"></span>
                    </div>
                </Show>

                <Show when={!loading() && events().length === 0}>
                    <p class="text-center text-gray-600">Nema dostupnih događaja</p>
                </Show>

                <Show when={!loading() && events().length > 0}>
                    <div class="max-w-4xl m-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                        <For each={events()}>
                            {(event) =>
                            (
                                <div class="card bg-base-200 shadow-md">
                                    <div class="card-body">
                                        <div class="flex justify-between items-start">
                                            <h3 class="card-title">{event.name}</h3>
                                            <button class="btn btn-ghost btn-circle btn-sm" onClick={() => toggleFavorite(event.id)}>
                                                {favorites().includes(event.id) ? "💙" : "🤍"}
                                            </button>
                                        </div>
                                        <p class="text-sm">{event.description}</p>
                                        <p class="text-xs text-gray-600">{formatEventDate(event.datetime)}</p>
                                        <Show when={event.favorites?.length > 0}>
                                            <p class="text-xs text-gray-500">💙 {event.favorites.length}</p>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>
            </Show>
        </>
    );
}