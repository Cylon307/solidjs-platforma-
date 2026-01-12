import { onMount } from "solid-js";
import { authService } from "../services/auth.js";
import { useNavigate } from "@solidjs/router";

export default function SignOut() {
    const navigate = useNavigate();

    onMount(async () => {
        await authService.signOut();
        navigate("/user/signin");
    });
}