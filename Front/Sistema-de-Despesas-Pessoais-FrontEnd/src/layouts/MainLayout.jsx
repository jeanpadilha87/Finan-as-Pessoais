// Layout principal da aplicação.
// Todas as páginas protegidas utilizarão esta estrutura.

import { Navigate, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";

function MainLayout() {
    const { user, loading } = useAuth();
    if (loading) return <div className="container py-5" role="status">Carregando sessão...</div>;
    if (!user) return <Navigate to="/" replace />;

    return (

        <>

            <Navbar />

            <main className="container mt-4">

                <Outlet />

            </main>

        </>

    );

}

export default MainLayout;
