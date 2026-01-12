import { createSignal, Show, For, createEffect } from "solid-js";
import { authService } from "../services/auth.js";
import { db } from "../lib/firebase.js";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export default function PrivateEvents() {
    const [events, setEvents] = createSignal([]);
    const [loading, setLoading] = createSignal(false);

    const loadPrivateEvents = async () => {
        setLoading(true);
        try {
            const userId = authService.getCurrentUser().uid;
            const eventsRef = collection(db, "events");
            const q = query(
                eventsRef,
                where("userId", "==", userId),
                where("isPrivate", "==", true),
                orderBy("datetime", "desc")
            );
            const snapshot = await getDocs(q);
            setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Failed to load private events", error.message);
        } finally {
            setLoading(false);
        }
    }

    const formatEventDate = (datetime) => {
        if (!datetime) return "Nije zadan datum";
        if (datetime.toDate) return datetime.toDate().toLocaleString();
        if (datetime.toLocaleString) return datetime.toLocaleString();
        return "Nije zadan datum";
    }

    const isEventPassed = (datetime) => {
        if (!datetime) return false;
        const eventDate = datetime.toDate ? datetime.toDate() : new Date(datetime);
        return eventDate < new Date();
    }

    createEffect(() => {
        loadPrivateEvents();
    });

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-4 w-full text-center">Privatni događaji</h1>

            <Show when={loading()}>
                <div class="flex justify-center">
                    <span class="loading loading-spinner loading-lg"></span>
                </div>
            </Show>

            <Show when={!loading() && events().length === 0}>
                <p class="text-center text-gray-600">Nemate privatnih događaja</p>
            </Show>

            <Show when={!loading() && events().length > 0}>
                <div class="max-w-4xl m-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    <For each={events()}>
                        {(event) => (
                            <div class={`card bg-base-200 shadow-md ${isEventPassed(event.datetime) ? "opacity-60" : ""}`}>
                                <div class="card-body">
                                    <div class="flex justify-between items-start">
                                        <h3 class="card-title">{event.name}</h3>
                                        <Show when={isEventPassed(event.datetime)}>
                                            <span class="badge badge-sm badge-neutral">Prošao</span>
                                        </Show>
                                    </div>
                                    <p class="text-sm">{event.description}</p>
                                    <p class="text-xs text-gray-600">{formatEventDate(event.datetime)}</p>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </>
    );
}
