import { useEffect, useState } from "react";
import api from "../services/api";
import { AuthContext } from "./authContextValue";

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        api.get("/csrf").then(() => api.get("/users/me"))
            .then(({ data }) => { if (active) setUser(data.user); })
            .catch(() => { if (active) setUser(null); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    function login(userData) { setUser(userData); }
    async function logout() {
        try { await api.post("/users/logout"); } finally { setUser(null); }
    }

    return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
