import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "./supabaseClient";

// 1 Create the Context
const AuthContext = createContext()

// 2 Create a Provider (wraps your whole app)
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // ← ADD THIS

    // 3 On page load, check if user is already signed in
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession(); // ← FIXED: Properly await
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Error checking session:', error);
                setUser(null);
            } finally {
                setLoading(false); // ← ADD THIS: Loading complete
            }
        };

        checkSession();

        // 4 Listen for changes — when user signs in or out
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            setLoading(false); 
        });

        // 5 Cleanup when component unmounts
        return () => subscription.unsubscribe(); 
    }, [])

    // 6 Provide the user value to all components
    return (
        <AuthContext.Provider value={{ user, loading }}> 
            {children}
        </AuthContext.Provider>
    );
}

// 7 Custom hook for easy access
export const useAuth = () => useContext(AuthContext);