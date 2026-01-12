import { createSignal } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";

export default function ResetPassword() {
    const [error, setError] = createSignal(null);
    const [success, setSuccess] = createSignal(null);

    const handleSubmit = async (e) => {
        setError(null);
        e.preventDefault();
        const data = new FormData(e.target);
        const email = data.get("email");
        console.log("Data", email);

        try {
            await authService.passwordReset(email);
            setSuccess(true);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-2 w-full text-center">Zaboravljena zaporka</h1>

            <Message message={error()} type="error" />

            <Show when={!success()}>
                <form class="max-w-2xl m-auto" onSubmit={handleSubmit}>
                    <label class="floating-label mb-1 w-full">
                        <input class="input input-md w-full" type="email" name="email" placeholder="E-mail adresa" required="true" />
                        <span>E-mail adresa</span>
                    </label>

                    <button type="submit" class="btn btn-primary">Potvrdi</button>
                </form>
            </Show>

            <Show when={success()}>
                <Message message="Na e-mail adresu ste primili upute za ponovno postavljanje zaporke" />
            </Show>
        </>
    );
}