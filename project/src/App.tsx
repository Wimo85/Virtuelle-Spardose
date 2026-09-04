import { useState, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  Minus,
  ArrowLeft,
  Trash2,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

type Transaction = {
  id: string;
  project_id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  goal: number;
  image_url: string | null;
  created_at: string;
};

type ProjectWithBalance = Project & {
  balance: number;
  transactions: Transaction[];
};

const STORAGE_KEY = 'spardose-data';

type StoredData = {
  projects: Project[];
  transactions: Transaction[];
};

function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [], transactions: [] };
    return JSON.parse(raw) as StoredData;
  } catch {
    return { projects: [], transactions: [] };
  }
}

function saveData(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithBalance | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const data = loadData();
    setProjects(data.projects);
    setTransactions(data.transactions);
  }, []);

  const persist = (p: Project[], t: Transaction[]) => {
    saveData({ projects: p, transactions: t });
  };

  const createProject = (name: string, goal: number, imageUrl: string) => {
    const project: Project = {
      id: uid(),
      name,
      goal,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    persist(updated, transactions);
    setShowCreateModal(false);
  };

  const deleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    const updatedTxns = transactions.filter((t) => t.project_id !== projectId);
    setProjects(updatedProjects);
    setTransactions(updatedTxns);
    persist(updatedProjects, updatedTxns);
    setSelectedProject(null);
  };

  const openProject = (project: Project) => {
    const projectTxns = transactions
      .filter((t) => t.project_id === project.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const balance = projectTxns.reduce((sum, t) => sum + t.amount, 0);
    setSelectedProject({ ...project, balance, transactions: projectTxns });
  };

  const addTransaction = (
    projectId: string,
    amount: number,
    type: 'deposit' | 'withdraw',
    note?: string
  ) => {
    const value = type === 'deposit' ? amount : -amount;
    const txn: Transaction = {
      id: uid(),
      project_id: projectId,
      amount: value,
      note: note ?? null,
      created_at: new Date().toISOString(),
    };
    const updatedTxns = [txn, ...transactions];
    setTransactions(updatedTxns);
    persist(projects, updatedTxns);

    const projectTxns = updatedTxns
      .filter((t) => t.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const balance = projectTxns.reduce((sum, t) => sum + t.amount, 0);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject({ ...project, balance, transactions: projectTxns });
    }
  };

  const deleteTransaction = (transactionId: string, projectId: string) => {
    const updatedTxns = transactions.filter((t) => t.id !== transactionId);
    setTransactions(updatedTxns);
    persist(projects, updatedTxns);

    const projectTxns = updatedTxns
      .filter((t) => t.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const balance = projectTxns.reduce((sum, t) => sum + t.amount, 0);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject({ ...project, balance, transactions: projectTxns });
    }
  };

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onAddTransaction={addTransaction}
        onDeleteTransaction={deleteTransaction}
        onDeleteProject={deleteProject}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Header />
        <ProjectList
          projects={projects}
          transactions={transactions}
          onOpen={openProject}
          onCreate={() => setShowCreateModal(true)}
        />
      </div>
      {showCreateModal && (
        <CreateProjectModal
          onCreate={createProject}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="mb-10 text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
        <PiggyBank className="h-8 w-8 text-white" strokeWidth={2} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Virtuelle Spardose
      </h1>
      <p className="mt-2 text-slate-500">
        Spare für deine Ziele – ein Projekt nach dem anderen.
      </p>
    </header>
  );
}

function ProjectList({
  projects,
  transactions,
  onOpen,
  onCreate,
}: {
  projects: Project[];
  transactions: Transaction[];
  onOpen: (p: Project) => void;
  onCreate: () => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <PiggyBank className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700">
          Noch keine Sparprojekte
        </h2>
        <p className="mt-2 max-w-sm text-slate-400">
          Lege dein erstes Sparprojekt an und beginne sofort mit dem Sparen.
        </p>
        <button
          onClick={onCreate}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Sparprojekt anlegen
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">
          Meine Sparprojekte
        </h2>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Neues Projekt
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const balance = transactions
            .filter((t) => t.project_id === p.id)
            .reduce((sum, t) => sum + t.amount, 0);
          return (
            <ProjectCard
              key={p.id}
              project={p}
              balance={balance}
              onOpen={() => onOpen(p)}
            />
          );
        })}
      </div>
    </>
  );
}

function ProjectCard({
  project,
  balance,
  onOpen,
}: {
  project: Project;
  balance: number;
  onOpen: () => void;
}) {
  const goal = project.goal;
  const progress = goal > 0 ? Math.min((balance / goal) * 100, 100) : 0;

  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
        {project.image_url ? (
          <img
            src={project.image_url}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PiggyBank className="h-12 w-12 text-white/80" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-slate-900">{project.name}</h3>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {formatCurrency(balance)} / {formatCurrency(goal)}
          </span>
          <span className="font-medium text-emerald-600">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function ProjectDetailView({
  project,
  onBack,
  onAddTransaction,
  onDeleteTransaction,
  onDeleteProject,
}: {
  project: ProjectWithBalance;
  onBack: () => void;
  onAddTransaction: (
    projectId: string,
    amount: number,
    type: 'deposit' | 'withdraw',
    note?: string
  ) => void;
  onDeleteTransaction: (transactionId: string, projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const [showAddModal, setShowAddModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const balance = project.balance;
  const goal = project.goal;
  const progress = goal > 0 ? Math.min((balance / goal) * 100, 100) : 0;
  const isComplete = balance >= goal;

  const handleAdd = (amount: number, note: string) => {
    if (!showAddModal || amount <= 0) return;
    onAddTransaction(project.id, amount, showAddModal, note || undefined);
    setShowAddModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </button>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-44 overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
            {project.image_url ? (
              <img
                src={project.image_url}
                alt={project.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <PiggyBank className="h-16 w-16 text-white/80" />
              </div>
            )}
            {isComplete && (
              <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-md backdrop-blur">
                <Check className="h-4 w-4" />
                Ziel erreicht!
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Ziel: {formatCurrency(goal)}
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Projekt löschen"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-600">
                  <Wallet className="h-3.5 w-3.5" />
                  Aktuell
                </div>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Target className="h-3.5 w-3.5" />
                  Noch nötig
                </div>
                <p className="mt-1 text-2xl font-bold text-slate-700">
                  {formatCurrency(Math.max(goal - balance, 0))}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">
                  {progress.toFixed(1)}% erreicht
                </span>
                <span className="text-slate-400">
                  {formatCurrency(balance)} / {formatCurrency(goal)}
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAddModal('deposit')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Einzahlen
              </button>
              <button
                onClick={() => setShowAddModal('withdraw')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 font-semibold text-red-600 shadow-md ring-1 ring-red-200 transition-all hover:bg-red-50 active:scale-95"
              >
                <Minus className="h-5 w-5" />
                Auszahlen
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            Kontobewegungen
          </h2>
          {project.transactions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <p className="text-slate-400">Noch keine Bewegungen vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {project.transactions.map((t) => {
                const isDeposit = t.amount >= 0;
                return (
                  <div
                    key={t.id}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
                        isDeposit
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {isDeposit ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold ${
                          isDeposit ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {isDeposit ? '+' : ''}
                        {formatCurrency(t.amount)}
                      </p>
                      <p className="text-sm text-slate-400">
                        {formatDate(t.created_at)}
                        {t.note ? ` · ${t.note}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteTransaction(t.id, project.id)}
                      className="flex-shrink-0 rounded-lg p-2 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Buchung löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddTransactionModal
          type={showAddModal}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Projekt löschen?"
          message={`„${project.name}" und alle zugehörigen Buchungen werden unwiderruflich gelöscht.`}
          confirmLabel="Löschen"
          onConfirm={() => {
            onDeleteProject(project.id);
            setShowDeleteConfirm(false);
          }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function AddTransactionModal({
  type,
  onSubmit,
  onClose,
}: {
  type: 'deposit' | 'withdraw';
  onSubmit: (amount: number, note: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const isDeposit = type === 'deposit';
  const parsedAmount = parseFloat(amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {isDeposit ? 'Einzahlung' : 'Auszahlung'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Betrag (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Notiz (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Taschengeld, Geschenk..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            onClick={() => onSubmit(parsedAmount, note)}
            disabled={!parsedAmount || parsedAmount <= 0}
            className={`w-full rounded-xl px-4 py-3.5 font-semibold text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              isDeposit
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
            }`}
          >
            {isDeposit ? 'Einzahlen' : 'Auszahlen'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({
  onCreate,
  onClose,
}: {
  onCreate: (name: string, goal: number, imageUrl: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const parsedGoal = parseFloat(goal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Neues Sparprojekt</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Projektname
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Urlaub, Fahrrad, Spiel..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Sparziel (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Bild URL (optional)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            onClick={() => onCreate(name.trim(), parsedGoal, imageUrl)}
            disabled={!name.trim() || !parsedGoal || parsedGoal <= 0}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sparprojekt anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-semibold text-white shadow-md shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
