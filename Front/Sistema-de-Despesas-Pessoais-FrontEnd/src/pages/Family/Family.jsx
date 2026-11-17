import { useEffect, useState } from "react";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth";

function normalizePermissions(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function Family() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");
    async function load() { try { const { data } = await api.get("/family/children"); setChildren(data.map((child) => ({ ...child, permissions: normalizePermissions(child.permissions) }))); } catch (err) { setError(err.response?.data?.error || "Não foi possível carregar as contas vinculadas."); } }
    useEffect(() => {
        let active = true;
        api.get("/family/children")
            .then(({ data }) => { if (active) setChildren(data.map((child) => ({ ...child, permissions: normalizePermissions(child.permissions) }))); })
            .catch((err) => { if (active) setError(err.response?.data?.error || "Não foi possível carregar as contas vinculadas."); });
        return () => { active = false; };
    }, []);
    async function create(event) {
        event.preventDefault(); setError("");
        try { await api.post("/family/children", { ...form, permissions: [] }); setForm({ name: "", email: "", password: "" }); await load(); }
        catch (err) { setError(err.response?.data?.error || "Não foi possível criar a conta."); }
    }
    async function toggle(child, permission) {
        const current = normalizePermissions(child.permissions);
        const next = current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission];
        setError("");
        setChildren((currentChildren) => currentChildren.map((item) => item.id === child.id ? { ...item, permissions: next } : item));
        try {
            const { data } = await api.patch(`/family/children/${child.id}/permissions`, { permissions: next });
            setChildren((currentChildren) => currentChildren.map((item) => item.id === child.id ? { ...data.user, permissions: normalizePermissions(data.user.permissions) } : item));
        } catch (err) {
            setChildren((currentChildren) => currentChildren.map((item) => item.id === child.id ? { ...item, permissions: current } : item));
            setError(err.response?.data?.error || "Não foi possível atualizar as permissões.");
        }
    }
    if (user?.accountType !== "parent") return <div className="container py-5"><p>Só o responsável pode gerenciar contas vinculadas.</p></div>;
    return <div className="container py-4"><h1 className="h2 mb-4">Contas da família</h1>
        {error && <div className="alert alert-warning" role="alert">{error}</div>}
        <form className="card card-body shadow-sm mb-4" onSubmit={create}><h2 className="h5">Criar conta de filho</h2><div className="row g-3"><div className="col-md-4"><label htmlFor="child-name" className="form-label">Nome</label><input id="child-name" className="form-control" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div><div className="col-md-4"><label htmlFor="child-email" className="form-label">E-mail</label><input id="child-email" type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div><div className="col-md-4"><label htmlFor="child-password" className="form-label">Senha inicial</label><input id="child-password" type="password" minLength={10} maxLength={72} className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div></div><button className="btn btn-primary align-self-start mt-3" type="submit">Criar conta</button></form>
        <section className="card card-body shadow-sm"><h2 className="h5">Permissões</h2>{children.length === 0 ? <p className="text-muted">Nenhuma conta vinculada ainda.</p> : children.map((child) => <div className="border-bottom py-3" key={child.id}><h3 className="h6">{child.name} <small className="text-muted">{child.email}</small></h3><div className="form-check"><input id={`dash-${child.id}`} className="form-check-input" type="checkbox" checked={child.permissions?.includes("view_dashboard")} onChange={() => toggle(child, "view_dashboard")} /><label className="form-check-label" htmlFor={`dash-${child.id}`}>Permitir visualizar dashboard e lançamentos</label></div><div className="form-check"><input id={`write-${child.id}`} className="form-check-input" type="checkbox" checked={child.permissions?.includes("manage_transactions")} onChange={() => toggle(child, "manage_transactions")} /><label className="form-check-label" htmlFor={`write-${child.id}`}>Permitir criar, editar e excluir lançamentos</label></div></div>)}</section>
    </div>;
}
export default Family;
