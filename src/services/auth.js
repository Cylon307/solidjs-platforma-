import { createSignal } from "solid-js";
import { auth } from "../lib/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification
} from "firebase/auth";

// global state
export const [currentUser, setCurrentUser] = createSignal(null);
export const [isAuthenticated, setIsAuthenticated] = createSignal(false);
export const [authLoading, setAuthLoading] = createSignal(true);

onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    setIsAuthenticated(!!user);
    setAuthLoading(false);

    if (user) {
        console.log("User OK", user);
    } else {
        console.log("NO User");
    }
});

export const authService = {
    async signUp(email, password, name = "") {
        try {
            // create user
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCred.user;

            // name update
            if (name.trim()) {
                await updateProfile(user, {
                    displayName: name.trim()
                    // TODO: additional user settings
                })
            }

            // email verification
            await sendEmailVerification(user);

            console.log("User signed up", user.email);
            return user;
        } catch (error) {
            console.error("Sign up error", error.code);
            throw this.getErrorMessage(error);
        }
    },
    async signIn(email, password) {
        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            return userCred.user;
        } catch (error) {
            console.error("Sign in error", error.code);
            throw this.getErrorMessage(error);
        }
    },
    async signOut() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign out error", error);
            throw this.getErrorMessage(error);
        }
    },
    async passwordReset(email) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Password reset error", error.code);
            throw this.getErrorMessage(error);
        }
    },
    async updateName(name) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("Korisnik nije prijavljen");
            }

            await updateProfile(user, {
                displayName: name.trim()
            });
        } catch (error) {
            console.error("Name update error", error);
            throw this.getErrorMessage(error);
        }
    },
    async verify() {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("Korisnik nije prijavljen");
            }
            if (user.emailVerified) {
                throw new Error("E-mail adresa je već potvrđena")
            }

            await sendEmailVerification(user);
        } catch (error) {
            console.error("Verification error", error);
            throw this.getErrorMessage(error);
        }
    },
    getCurrentUser() {
        return auth.currentUser;
    },
    isUserAuthenticated() {
        return !!auth.currentUser;
    },
    isEmailVerified() {
        return auth.currentUser?.emailVerified || false;
    },
    getErrorMessage(error) {
        const errorMessages = {
            // Sign up errors
            "auth/email-already-in-use": "E-mail adresa je već u upotrebi",
            "auth/invalid-email": "E-mail adresa nije u ispravnom obliku",
            "auth/weak-password": "Zaporka je prejednostavna",
            // Sign in errors
            "auth/user-not-found": "Korisnik ne postoji",
            "auth/wrong-password": "Zaporka nije točna",
            "auth/user-disabled": "Korisnički račun je blokiran",
            "auth/invalid-credential": "Pogrešni podaci za prijavu",
            // General errors
            "auth/too-many-requests": "Previše neuspjelih pokušaja",
            "auth/network-request-failed": "Greška mreže",
            "auth/operation-not-allowed": "Operacija nije dopuštena, kontaktirajte administratora"
        };
        const message = errorMessages[error.code] || "Dogodila se neočekivana greška, kontaktirajte administratora";
        return new Error(message);
    }
};