import { useEffect, useState } from "react";
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth";

const COLORS = ["#198754", "#0d6efd", "#ffc107", "#dc3545", "#6f42c1", "#20c997", "#fd7e14", "#6610f2"];
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CategoryChart({ title, data, color }) {
    return <section className="card border-0 shadow-sm h-100">
        <div className="card-body">
            <h2 className="h5">{title}</h2>
            {!data?.length ? <p className="text-muted mb-0">Nenhum lançamento neste período.</p> : <>
                <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => money(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2">{data.map((entry, index) => <div className="d-flex justify-content-between border-bottom py-2" key={entry.name}>
                    <span><span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS[index % COLORS.length], marginRight: 8 }} />{entry.name}</span>
                    <strong className={color}>{money(entry.total)}</strong>
                </div>)}</div>
            </>}
        </div>
    </section>;
}

function Dashboard() {
    const { user } = useAuth();
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, count: 0, incomeByCategory: [], expenseByCategory: [] });
    const [recent, setRecent] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        Promise.all([api.get("/dashboard/summary", { params }), api.get("/expenses", { params })])
            .then(([summaryResponse, expensesResponse]) => {
                if (!active) return;
                setSummary(summaryResponse.data);
                setRecent(expensesResponse.data.slice(0, 8));
                setError("");
            })
            .catch((err) => { if (active) setError(err.response?.data?.error || "Não foi possível carregar o resumo financeiro."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [startDate, endDate]);

    const cards = [
        { label: "Receitas", value: summary.income, color: "text-success" },
        { label: "Despesas", value: summary.expense, color: "text-danger" },
        { label: "Saldo do período", value: summary.balance, color: summary.balance >= 0 ? "text-primary" : "text-danger" },
        { label: "Lançamentos", value: summary.count, color: "text-dark", isCount: true }
    ];

    return <div className="container py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
            <div><h1 className="h2 mb-1">Dashboard financeiro</h1>{user?.accountType === "child" && <p className="text-muted mb-0">Conta de {user.name}</p>}</div>
            <div className="d-flex gap-2">
                <div><label className="form-label mb-1" htmlFor="dashboard-start">De</label><input id="dashboard-start" className="form-control" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><label className="form-label mb-1" htmlFor="dashboard-end">Até</label><input id="dashboard-end" className="form-control" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                {(startDate || endDate) && <button className="btn btn-outline-secondary align-self-end" onClick={() => { setStartDate(""); setEndDate(""); }}>Limpar</button>}
            </div>
        </div>
        {error && <div className="alert alert-warning" role="alert">{error}</div>}
        {loading && <div className="text-muted mb-3" role="status">Atualizando dashboard...</div>}

        <div className="row g-3">
            {cards.map((card) => <div className="col-sm-6 col-xl-3" key={card.label}><div className="card border-0 shadow-sm h-100"><div className="card-body"><h2 className="h6 text-muted">{card.label}</h2><p className={`h3 mb-0 ${card.color}`}>{card.isCount ? card.value : money(card.value)}</p></div></div></div>)}
        </div>

        <div className="row g-3 mt-1">
            <div className="col-lg-6"><CategoryChart title="Receitas por categoria" data={summary.incomeByCategory} color="text-success" /></div>
            <div className="col-lg-6"><CategoryChart title="Despesas por categoria" data={summary.expenseByCategory} color="text-danger" /></div>
        </div>

        <section className="card border-0 shadow-sm mt-4"><div className="card-body">
            <h2 className="h5">Comparativo do período</h2>
            <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                    <BarChart data={[{ name: "Período selecionado", Receitas: summary.income, Despesas: summary.expense }]} margin={{ top: 12, right: 20, left: 12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `R$ ${value}`} />
                        <Tooltip formatter={(value) => money(value)} />
                        <Legend />
                        <Bar dataKey="Receitas" fill="#198754" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="Despesas" fill="#dc3545" radius={[5, 5, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div></section>

        <section className="card border-0 shadow-sm mt-4"><div className="card-body">
            <h2 className="h5">Lançamentos recentes</h2>
            {recent.length === 0 ? <p className="text-muted mb-0">Nenhum lançamento encontrado neste período.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Status</th><th className="text-end">Valor</th></tr></thead><tbody>{recent.map((item) => <tr key={item.id}><td>{new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")}</td><td>{item.type === "income" ? "Receita" : "Despesa"}</td><td>{item.category?.name}</td><td>{item.description}</td><td>{item.status}</td><td className={`text-end ${item.type === "income" ? "text-success" : "text-danger"}`}>{money(item.amount)}</td></tr>)}</tbody></table></div>}
        </div></section>
    </div>;
}

export default Dashboard;
