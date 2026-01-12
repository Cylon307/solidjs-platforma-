import { useLocation } from "@solidjs/router";

export default function Error() {
    const location = useLocation();
    const error = location.state?.error ?? {};
    const title = error.title ?? "Greška";
    const message = error.message ?? "Dogodila se neočekivana greška.";

    return (
        <div class="hero bg-red-900 min-h-[50vh]">
            <div class="hero-content text-center">
                <div class="max-w-md">
                    <h1 class="text-5xl font-bold">{title}</h1>
                    <p class="py-6">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}