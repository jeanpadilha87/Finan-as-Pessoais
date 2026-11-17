import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/LOGO.png";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth";

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setError("");
        try {
            await api.get("/csrf");
            if (registering) await api.post("/users", { name, email, password });
            const { data } = await api.post("/users/login", { email, password });
            login(data.user);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.error || "Não foi possível autenticar.");
        }
    }

    return <div className="container"><div className="row justify-content-center mt-5"><div className="col-md-5">
        <div className="card shadow"><div className="card-body p-4">
            <div className="text-center mb-4"><img src={logo} alt="Sistema de Finanças Pessoais" className="img-fluid" style={{ maxWidth: 420 }} /></div>
            <h1 className="h4 text-center mb-4">{registering ? "Criar conta" : "Entrar"}</h1>
            <form onSubmit={submit}>
                {registering && <div className="mb-3"><label className="form-label" htmlFor="name">Nome</label><input id="name" className="form-control" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required /></div>}
                <div className="mb-3"><label className="form-label" htmlFor="email">E-mail</label><input id="email" type="email" className="form-control" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="mb-3"><label className="form-label" htmlFor="password">Senha</label><input id="password" type="password" className="form-control" autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={registering ? 10 : undefined} maxLength={72} required /></div>
                {error && <p className="text-danger" role="alert">{error}</p>}
                <button className="btn btn-success w-100" type="submit">{registering ? "Criar conta" : "Entrar"}</button>
            </form>
            <button className="btn btn-link w-100 mt-2" type="button" onClick={() => { setRegistering(!registering); setError(""); }}>{registering ? "Já tenho uma conta" : "Criar uma conta"}</button>
        </div></div>
    </div></div></div>;
}
export default Login;
