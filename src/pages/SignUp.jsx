import { createSignal, Show } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";

export default function SignUp() {
    const [error, setError] = createSignal(null);
    const [success, setSuccess] = createSignal(false);

    const handleSubmit = async (e) => {
        setError(null);
        e.preventDefault();
        const data = new FormData(e.target);
        const name = data.get("name");
        const email = data.get("email");
        const password = data.get("password");
        const passwordConfirm = data.get("passwordConfirm");
        console.log("Data", name, email, password, passwordConfirm);

        if (password != passwordConfirm) {
            setError("Zaporke se ne podudaraju");
            return;
        }

        try {
            await authService.signUp(email, password, name);
            setSuccess(true);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-4 w-full text-center">Registracija korisnika</h1>

            <Message message={error()} type="error" />

            <Show when={!success()}>
                <form class="max-w-2xl m-auto" onSubmit={handleSubmit}>
                    <label class="floating-label mb-1 w-full">
                        <input class="input input-md w-full" type="text" name="name" placeholder="Ime" required="true" />
                        <span>Ime</span>
                    </label>

                    <label class="floating-label mb-1 w-full">
                        <input class="input input-md w-full" type="email" name="email" placeholder="E-mail adresa" required="true" />
                        <span>E-mail adresa</span>
                    </label>

                    <label class="floating-label mb-1">
                        <input class="input input-md w-full" type="password" name="password" placeholder="Zaporka" required="true" />
                        <span>Zaporka</span>
                    </label>

                    <label class="floating-label mb-1">
                        <input class="input input-md w-full" type="password" name="passwordConfirm" placeholder="Potvrda zaporke" required="true" />
                        <span>Potvrda zaporke</span>
                    </label>

                    <button type="submit" class="btn btn-primary">Potvrdi</button>
                </form>
            </Show>

            <Show when={success()}>
                <Message message="Uspješno ste napravili korisnički račun; možete na prijavu" />
            </Show>
        </>
    );
}