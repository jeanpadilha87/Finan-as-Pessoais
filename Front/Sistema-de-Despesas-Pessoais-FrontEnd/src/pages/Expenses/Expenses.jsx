import { useEffect, useState } from "react";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth";

const empty = { description: "", amount: "", date: "", status: "PAGA", type: "expense", categoryId: "" };
const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Expenses() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(empty);
    const [file, setFile] = useState(null);
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({ type: "", startDate: "", endDate: "" });
    const canWrite = user?.accountType !== "child" || user?.permissions?.includes("manage_transactions");

    async function load() {
        try { const { data } = await api.get("/expenses", { params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }); setItems(data); setError(""); }
        catch (err) { setError(err.response?.data?.error || "Não foi possível carregar os lançamentos."); }
    }
    useEffect(() => {
        let active = true;
        const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
        api.get("/expenses", { params })
            .then(({ data }) => { if (active) { setItems(data); setError(""); } })
            .catch((err) => { if (active) setError(err.response?.data?.error || "Could not load transactions."); });
        return () => { active = false; };
    }, [filters]);
    useEffect(() => {
        let active = true;
        api.get("/categories")
            .then(({ data }) => { if (active) setCategories(data); })
            .catch(() => { if (active) setError("Não foi possível carregar categorias."); });
        return () => { active = false; };
    }, []);

    function startEdit(item) { setEditing(item.id); setForm({ description: item.description, amount: item.amount, date: item.date, status: item.status, type: item.type, categoryId: String(item.categoryId) }); setFile(null); setShowForm(true); }
    function closeForm() { setShowForm(false); setEditing(null); setForm(empty); setFile(null); }
    async function save(event) {
        event.preventDefault(); setError("");
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => body.append(key, value));
        if (file) body.append("receipt", file);
        try {
            if (editing) await api.put(`/expenses/${editing}`, body);
            else await api.post("/expenses", body);
            closeForm(); await load();
        } catch (err) { setError(err.response?.data?.error || "Não foi possível salvar o lançamento."); }
    }
    async function remove(id) {
        if (!window.confirm("Excluir este lançamento?")) return;
        try { await api.delete(`/expenses/${id}`); await load(); }
        catch (err) { setError(err.response?.data?.error || "Não foi possível excluir o lançamento."); }
    }

    return <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3"><h1 className="h2">Receitas e despesas</h1>{canWrite && <button className="btn btn-success" onClick={() => { closeForm(); setShowForm(true); }}>Novo lançamento</button>}</div>
        {error && <div className="alert alert-warning" role="alert">{error}</div>}
        <div className="row g-2 mb-3"><div className="col-md-3"><label className="form-label" htmlFor="filter-type">Tipo</label><select id="filter-type" className="form-select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></div><div className="col-md-3"><label className="form-label" htmlFor="filter-from">De</label><input id="filter-from" className="form-control" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></div><div className="col-md-3"><label className="form-label" htmlFor="filter-to">Até</label><input id="filter-to" className="form-control" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></div></div>
        {showForm && <form className="card card-body shadow-sm mb-4" onSubmit={save}><h2 className="h5">{editing ? "Editar lançamento" : "Novo lançamento"}</h2>
            <div className="row g-3"><div className="col-md-3"><label className="form-label" htmlFor="entry-type">Tipo</label><select id="entry-type" className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: "" })}><option value="expense">Despesa</option><option value="income">Receita</option></select></div>
                <div className="col-md-5"><label className="form-label" htmlFor="entry-description">Descrição</label><input id="entry-description" className="form-control" value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
                <div className="col-md-2"><label className="form-label" htmlFor="entry-amount">Valor (R$)</label><input id="entry-amount" className="form-control" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                <div className="col-md-2"><label className="form-label" htmlFor="entry-date">Data</label><input id="entry-date" className="form-control" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
                <div className="col-md-4"><label className="form-label" htmlFor="entry-category">Categoria</label><select id="entry-category" className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required><option value="">Selecione</option>{categories.filter((category) => category.type === "both" || category.type === form.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
                <div className="col-md-3"><label className="form-label" htmlFor="entry-status">Status</label><select id="entry-status" className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="PAGA">Concluído</option><option value="PENDENTE">Pendente</option></select></div>
                <div className="col-md-5"><label className="form-label" htmlFor="receipt">Recibo (PDF ou imagem, até 5 MB)</label><input id="receipt" className="form-control" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            </div><div className="d-flex gap-2 mt-3"><button className="btn btn-primary" type="submit">Salvar</button><button className="btn btn-secondary" type="button" onClick={closeForm}>Cancelar</button></div>
        </form>}
        <div className="table-responsive"><table className="table table-striped table-hover align-middle"><thead className="table-dark"><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Status</th><th className="text-end">Valor</th><th>Recibo</th>{canWrite && <th>Ações</th>}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")}</td><td>{item.type === "income" ? "Receita" : "Despesa"}</td><td>{item.category?.name}</td><td>{item.description}</td><td>{item.status}</td><td className={`text-end ${item.type === "income" ? "text-success" : "text-danger"}`}>{money(item.amount)}</td><td>{item.receiptPath && <button className="btn btn-sm btn-outline-primary" onClick={async () => { const { data } = await api.get(`/expenses/${item.id}/receipt`, { responseType: "blob" }); const url = URL.createObjectURL(data); const link = document.createElement("a"); link.href = url; link.download = `recibo-${item.id}`; link.click(); URL.revokeObjectURL(url); }}>Baixar</button>}</td>{canWrite && <td><button className="btn btn-sm btn-outline-secondary me-1" onClick={() => startEdit(item)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={() => remove(item.id)}>Excluir</button></td>}</tr>)}{items.length === 0 && <tr><td colSpan={canWrite ? 8 : 7} className="text-center text-muted py-4">Nenhum lançamento encontrado.</td></tr>}</tbody></table></div>
    </div>;
}
export default Expenses;
