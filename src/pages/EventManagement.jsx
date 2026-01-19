import { createSignal, Show, For, createEffect } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";
import { db } from "../lib/firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  limit,
  orderBy
} from "firebase/firestore";

const CATEGORIES = ["Sports", "Music", "Social", "Other"];

export default function EventManagement() {
  let formRef;
  const [searchTerm, setSearchTerm] = createSignal("");
  const [filterCategory, setFilterCategory] = createSignal(""); 
  const [events, setEvents] = createSignal([]);
  const [selectedEvent, setSelectedEvent] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [success, setSuccess] = createSignal(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const userId = authService.getCurrentUser().uid;
      const eventsRef = collection(db, "events");

      let q = query(
        eventsRef,
        where("userId", "==", userId),
        orderBy("created", "desc")
      );
      //filtriranje
      if (filterCategory()) {
        q = query(q, where("category", "==", filterCategory()));
      }

      const snapshot = await getDocs(q);
      const loadedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setEvents(loadedEvents);
    } catch (err) {
      console.error(err);
      setError("Greška pri učitavanju događaja");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    loadEvents();
  });

  const searchEvents = async () => {
    const term = searchTerm().toLowerCase().trim();
    if (!term || term.length <= 2) {
      loadEvents();
      return;
    }

    setLoading(true);
    try {
      const userId = authService.getCurrentUser().uid;
      const eventsRef = collection(db, "events");

      let q = query(
        eventsRef,
        where("userId", "==", userId),
        orderBy("created", "desc")
      );

      if (filterCategory()) {
        q = query(q, where("category", "==", filterCategory()));
      }

      const snapshot = await getDocs(q);
      const found = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((event) => event.name?.toLowerCase().includes(term));

      setEvents(found);
    } catch (err) {
      console.error(err);
      setError("Greška pri pretraživanju");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const userId = authService.getCurrentUser().uid;
    const data = new FormData(e.target);

    const eventData = {
      name: data.get("name")?.trim(),
      description: data.get("description")?.trim(),
      datetime: new Date(data.get("datetime")),
      isPrivate: !!data.get("isPrivate"),
      category: data.get("category") || "Other",   
      userId,
      created: new Date()
    };

    try {
      if (selectedEvent()) {
        const docRef = doc(db, "events", selectedEvent().id);
        await updateDoc(docRef, eventData);
        setEvents(
          events().map((ev) =>
            ev.id === selectedEvent().id ? { ...ev, ...eventData } : ev
          )
        );
        setSelectedEvent({ ...selectedEvent(), ...eventData });
        setSuccess("Događaj ažuriran");
      } else {
        const docRef = await addDoc(collection(db, "events"), eventData);
        setEvents([...events(), { id: docRef.id, ...eventData }]);
        e.target.reset();
        setSuccess("Događaj dodan");
      }
    } catch (err) {
      console.error(err);
      setError(
        selectedEvent()
          ? "Ažuriranje nije uspjelo"
          : "Dodavanje nije uspjelo"
      );
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sigurno želite obrisati događaj?")) return;
    setError(null);
    setSuccess(null);

    try {
      const docRef = doc(db, "events", selectedEvent().id);
      await deleteDoc(docRef);
      setEvents(events().filter((ev) => ev.id !== selectedEvent().id));
      setSelectedEvent(null);
      formRef.reset();
      setSuccess("Događaj obrisan");
    } catch (err) {
      console.error(err);
      setError("Brisanje nije uspjelo");
    }
  };

  createEffect(() => {
    if (selectedEvent() && formRef) {
      const ev = selectedEvent();
      formRef.name.value = ev.name || "";
      formRef.description.value = ev.description || "";
      formRef.category.value = ev.category || "Other";
      if (ev.datetime) {
        const date = ev.datetime.toDate ? ev.datetime.toDate() : ev.datetime;
        formRef.datetime.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
      formRef.isPrivate.checked = !!ev.isPrivate;
    }
  });

  const formatEventDate = (datetime) => {
    if (!datetime) return "—";
    const d = datetime.toDate ? datetime.toDate() : new Date(datetime);
    return d.toLocaleString("hr-HR", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  return (
    <>
      <h1 class="text-2xl uppercase tracking-wider mb-6 text-center">
        {selectedEvent() ? "Uređivanje događaja" : "Upravljanje događajima"}
      </h1>

      {}
      <div class="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row gap-4">
        <div class="join w-full sm:w-2/3">
          <input
            class="input input-bordered join-item w-full"
            type="text"
            placeholder="Pretraži po nazivu..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchEvents()}
          />
          <button class="btn join-item" onClick={searchEvents}>
            Traži
          </button>
        </div>

        <select
          class="select select-bordered w-full sm:w-1/3"
          value={filterCategory()}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Sve kategorije</option>
          <For each={CATEGORIES}>
            {(cat) => <option value={cat}>{cat}</option>}
          </For>
        </select>
      </div>

      <Show when={loading()}>
        <div class="flex justify-center my-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </Show>

      <Show when={events().length > 0 && !loading()}>
        <div class="max-w-3xl mx-auto mb-8 space-y-3">
          <For each={events()}>
            {(event) => (
              <div
                class={`card bg-base-200 shadow cursor-pointer hover:bg-base-300 transition-colors ${
                  selectedEvent()?.id === event.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div class="card-body p-4">
                  <div class="flex justify-between items-start">
                    <h3 class="font-bold text-lg">{event.name}</h3>
                    <div class="badge badge-outline badge-sm">
                      {event.category || "Other"}
                    </div>

                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    {formatEventDate(event.datetime)}
                    {event.isPrivate && (
                      <span class="badge badge-warning badge-sm ml-2">Privatno</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
      //filtriranje
      <Show when={!loading() && events().length === 0}>
        <div class="alert alert-info max-w-2xl mx-auto">
          <span>Nema događaja koji odgovaraju filtrima.</span>
        </div>
      </Show>

      <Message message={error()} type="error" />
      <Message message={success()} type="success" />

      {}
      <form
        class="max-w-2xl mx-auto card bg-base-100 shadow-xl p-6"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <div class="grid grid-cols-1 gap-5">
          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">Naziv događaja</span>
            </div>
            <input
              type="text"
              name="name"
              class="input input-bordered w-full"
              placeholder="Upisite naziv događaja ovdje"
              required
            />
          </label>

          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">Kategorija</span>
            </div>
            <select name="category" class="select select-bordered w-full" required>
              <For each={CATEGORIES}>
                {(cat) => <option value={cat}>{cat}</option>}
              </For>
            </select>
          </label>

          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">Opis</span>
            </div>
            <textarea
              name="description"
              class="textarea textarea-bordered w-150 h-15"
              placeholder="Kratki opis događaja..."
              required
            ></textarea>
          </label>

          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">Datum i vrijeme</span>
            </div>
            <input
              type="datetime-local"
              name="datetime"
              class="input input-bordered w-full"
              required
            />
          </label>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input type="checkbox" name="isPrivate" class="toggle" />
              <span class="label-text">Privatni događaj (samo s pozivnicom)</span>
            </label>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 justify-end mt-8">
          <Show when={selectedEvent()}>
            <button
              type="button"
              class="btn btn-error"
              onClick={handleDelete}
            >
              Izbriši
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => {
                setSelectedEvent(null);
                formRef.reset();
              }}
            >
              Odustani
            </button>
          </Show>
          <button type="submit" class="btn btn-primary">
            {selectedEvent() ? "Spremi promjene" : "Dodaj događaj"}
          </button>
        </div>
      </form>
    </>
  );
}