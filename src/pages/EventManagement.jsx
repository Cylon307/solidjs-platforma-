import { createSignal, Show, For, createEffect } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";
import { db } from "../lib/firebase.js";
import { collection, addDoc, query, where, updateDoc, deleteDoc, getDocs, doc, limit, orderBy } from "firebase/firestore";

export default function EventManagement() {
    let formRef;

    const [searchTerm, setSearchTerm] = createSignal("");
    const [events, setEvents] = createSignal([]);
    const [selectedEvent, setSelectedEvent] = createSignal(null);
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal(null);
    const [success, setSuccess] = createSignal(null);

    // učitavanje prvih 10 događaja
    const loadInitialEvents = async () => {
        setLoading(true);
        try {
            const userId = authService.getCurrentUser().uid;
            const eventsRef = collection(db, "events");
            const q = query(
                eventsRef,
                where("userId", "==", userId),
                orderBy("created", "desc"),
                limit(10)
            );
            const snapshot = await getDocs(q);
            setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error(error.message);
            setError("Greška inicijalnog učitavanja događaja");
        } finally {
            setLoading(false);
        }
    }
    loadInitialEvents(); // poziv pri pokretanju komponenta

    // pretraživanje
    const searchEvents = async () => {
        const term = searchTerm().toLowerCase().trim();
        if (!term || term.length <= 3) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const userId = authService.getCurrentUser().uid;
            const eventsRef = collection(db, "events");
            const q = query(
                eventsRef,
                where("userId", "==", userId),
                orderBy("created", "desc"),
                limit(100)
            );
            const snapshot = await getDocs(q);
            const found = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((event) => event.name.toLowerCase().includes(term));
            setEvents(found);
        } catch (error) {
            console.error(error.message);
            setError("Greška pretraživanja");
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError(null);
        setSuccess(null);

        const userId = authService.getCurrentUser().uid;

        const data = new FormData(e.target);
        const eventData = {
            name: data.get("name"),
            description: data.get("description"),
            datetime: new Date(data.get("datetime")),
            isPrivate: !!data.get("isPrivate"),
            userId: userId,
            created: new Date()
        };
        console.log("Event data", eventData);

        try {
            if (selectedEvent()) {
                // ažuriranje
                const docRef = doc(db, "events", selectedEvent().id);
                await updateDoc(docRef, eventData);
                setEvents(
                    events().map((event) => (event.id === selectedEvent().id ? { ...event, ...eventData } : event))
                );
                setSelectedEvent({ ...selectedEvent(), ...eventData });
            } else {
                // dodavanje
                const eventsRef = collection(db, "events");
                const docRef = await addDoc(eventsRef, eventData);
                setEvents([...events(), { id: docRef.id, ...eventData }]);
                e.target.reset();
            }
            setSuccess(selectedEvent() ? "Događaj je uspješno ažuriran" : "Događaj je uspješno dodan");
        } catch (error) {
            console.error("Operation error", error.message);
            setError(selectedEvent() ? "Ažuriranje događaja nije uspjelo" : "Dodavanje događaja nije uspjelo");
        }
    };

    // brisanje
    const handleDelete = async () => {
        if (!confirm("Jeste li sigurni?")) return;

        setError(null);
        setSuccess(null);

        try {
            const docRef = doc(db, "events", selectedEvent().id);
            await deleteDoc(docRef);
            setEvents(events().filter((event) => (event.id !== selectedEvent().id)));
            setSelectedEvent(null);
            formRef.reset();
            setSuccess("Događaj je uspješno obrisan");
        } catch (error) {
            console.error("Delete error", error.message);
            setError("Brisanje nije uspjelo");
        }
    };

    createEffect(() => {
        if (selectedEvent() && formRef) {
            const event = selectedEvent();
            formRef.name.value = event.name;
            formRef.description.value = event.description;
            if (event.datetime) {
                const date = event.datetime.toDate ? event.datetime.toDate() : event.datetime;
                formRef.datetime.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            }
            formRef.isPrivate.checked = event.isPrivate;
        }
    });

    // pomoćna funkcija za oblikovanje datuma
    const formatEventDate = (datetime) => {
        if (!datetime) return "Nije zadan datum";
        if (datetime.toDate) return datetime.toDate().toLocaleString();
        if (datetime.toLocaleString) return datetime.toLocaleString();
        return "Nije zadan datum";
    }

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-4 w-full text-center">
                {selectedEvent() ? "Uređivanje događaja" : "Dodavanje događaja"}
            </h1>

            {/* Pretraživanje */}
            <div class="max-w-2xl m-auto mb-4">
                <div class="join w-full">
                    <input
                        class="input input-bordered join-item w-full"
                        type="text"
                        placeholder="Pretraživanje po nazivu"
                        value={searchTerm()}
                        onInput={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchEvents()}
                    />
                    <button class="btn join-item" onClick={searchEvents}>
                        Traži
                    </button>
                </div>
            </div>

            {/* Tijek učitavanja */}
            <Show when={loading()}>
                <div class="flex justify-center">
                    <span class="loading loading-spinner loading-lg"></span>
                </div>
            </Show>

            {/* Prikaz događaja */}
            <Show when={events().length > 0}>
                <div class="max-w-2xl m-auto mb-4 space-y-2">
                    <For each={events()}>
                        {(event) => (
                            <div
                                class={`card bg-base-200 cursor-pointer hover:bg-base-300 ${selectedEvent()?.id === event.id ? "ring-2 ring-primary" : ""}`}
                                onClick={() => setSelectedEvent(event)}
                            >
                                <div class="card-body p-4">
                                    <h3 class="font-bold">{event.name}</h3>
                                    <p class="text-sm text-gray-600">
                                        {formatEventDate(event.datetime)}
                                        {event.isPrivate && <span class="badge badge-sm ml-2">Privatan</span>}
                                    </p>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Message message={error()} type="error" />
            <Message message={success()} />

            <form class="max-w-2xl m-auto" onSubmit={handleSubmit} ref={formRef}>
                <label class="floating-label mb-1 w-full">
                    <input class="input input-md w-full" type="text" name="name" placeholder="Ime" required />
                    <span>Naziv</span>
                </label>

                <fieldset class="fieldset">
                    <textarea class="textarea h-24 w-full" placeholder="Opis" name="description" required></textarea>
                </fieldset>

                <label class="floating-label mb-1 w-full">
                    <input class="input input-md w-full" type="datetime-local" name="datetime" placeholder="Datum i vrijeme" required />
                    <span>Datum i vrijeme</span>
                </label>

                <fieldset class="fieldset py-2">
                    <label class="label">
                        <input type="checkbox" class="toggle" name="isPrivate" />
                        Privatan događaj
                    </label>
                </fieldset>

                <div class="flex gap-2 justify-between">
                    <Show when={selectedEvent()}>
                        <button type="button" class="btn btn-error" onClick={handleDelete}>
                            Izbriši
                        </button>
                        <button type="button" class="btn btn-ghost"
                            onClick={() => {
                                setSelectedEvent(null);
                                formRef.reset();
                            }}>
                            Odustani
                        </button>
                    </Show>
                    <button type="submit" class="btn btn-primary">
                        {selectedEvent() ? "Spremi" : "Dodaj"}
                    </button>
                </div>
            </form>
        </>
    );
}