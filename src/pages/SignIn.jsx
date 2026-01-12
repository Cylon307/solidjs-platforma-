import { createSignal } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";
import { useNavigate } from "@solidjs/router";

export default function SignIn() {
    const navigate = useNavigate();

    const [error, setError] = createSignal(null);

    const handleSubmit = async (e) => {
        setError(null);
        e.preventDefault();
        const data = new FormData(e.target);
        const email = data.get("email");
        const password = data.get("password");
        console.log("Data", email, password);

        try {
            await authService.signIn(email, password);
            navigate("/");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-2 w-full text-center">Prijava korisnika</h1>

            <Message message={error()} type="error" />

            <form class="max-w-2xl m-auto" onSubmit={handleSubmit}>
                <label class="floating-label mb-1 w-full">
                    <input class="input input-md w-full" type="email" name="email" placeholder="E-mail adresa" required="true" />
                    <span>E-mail adresa</span>
                </label>

                <label class="floating-label mb-1">
                    <input class="input input-md w-full" type="password" name="password" placeholder="Zaporka" required="true" />
                    <span>Zaporka</span>
                </label>

                <button type="submit" class="btn btn-primary">Potvrdi</button>
                <a class="btn btn-info ml-2" href="/user/resetpassword">Zaboravili ste zaporku?</a>
            </form>
        </>
    );
}