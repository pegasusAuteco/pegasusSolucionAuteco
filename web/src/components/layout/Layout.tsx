import { useState, useRef, useEffect } from 'react';
import ChatContainer from '../chat/ChatContainer';
import MotorcycleList from '../inventory/MotorcycleList';
import { MessageSquare, Plus, LogOut, Bike, X, BarChart3, Wrench } from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@store/chatStore';
import {
  useConversations,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
  useDeleteAllConversations,
} from '@hooks/useChat';
import AdminPage from '@pages/AdminPage';
import CompactMechanicQueue from '../workshop/CompactMechanicQueue';

const Layout = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'inventory' | 'queue'>('chat');
  const [activePanelDesktop, setActivePanelDesktop] = useState<'inventory' | 'metrics' | 'queue'>('queue');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const creatingConversation = useRef(false);
  const { activeConversationId, setActiveConversation } = useChatStore();
  const { data: conversations } = useConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();
  const deleteAllConversations = useDeleteAllConversations();

  useEffect(() => {
    if (activeConversationId || conversations === undefined) return;
    if (conversations.length > 0) {
      setActiveConversation(conversations[0].id);
      creatingConversation.current = false;
    } else if (!creatingConversation.current) {
      creatingConversation.current = true;
      createConversation.mutate('Nuevo chat', {
        onSuccess: (conv) => {
          setActiveConversation(conv.id);
          creatingConversation.current = false;
        },
        onError: () => { creatingConversation.current = false; },
      });
    }
  }, [activeConversationId, conversations, setActiveConversation, createConversation]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleNewChat = () => {
    createConversation.mutate('Nuevo chat', {
      onSuccess: (conv) => {
        setActiveConversation(conv.id);
        setChatHistoryOpen(false);
      },
    });
  };

  const handleRename = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conversations?.find((c) => c.id === id)?.title) {
      renameConversation.mutate({ conversationId: id, title: trimmed });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteConversation.mutate(id);
    setDeletingId(null);
  };

  const ChatHistoryDrawer = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Chats guardados
        </span>
        <button
          onClick={() => setChatHistoryOpen(false)}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 bg-auteco-red text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {conversations?.map((chat) => (
          <div
            key={chat.id}
            className={`group relative flex items-center rounded-xl transition-all ${
              chat.id === activeConversationId
                ? 'bg-auteco-red/10 text-auteco-red dark:bg-auteco-red/20'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {editingId === chat.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(chat.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => handleRename(chat.id)}
                autoFocus
                className="flex-1 mx-2 my-1 px-2 py-1.5 text-sm rounded-lg border border-auteco-red bg-white dark:bg-gray-800 dark:text-gray-200 outline-none"
              />
            ) : (
              <>
                <button
                  onClick={() => { setActiveConversation(chat.id); setChatHistoryOpen(false); }}
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 text-left overflow-hidden"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className={`text-sm truncate ${chat.id === activeConversationId ? 'font-semibold' : ''}`}>
                    {chat.title || 'Chat'}
                  </span>
                </button>
                <div className="invisible group-hover:visible flex items-center gap-1 pr-2 shrink-0">
                  <button
                    onClick={() => { setEditingId(chat.id); setEditTitle(chat.title || ''); }}
                    className="text-xs px-1.5 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingId(chat.id)}
                    className="text-xs px-1.5 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
        {conversations && conversations.length > 0 && (
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="w-full text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-3 rounded-xl transition-colors text-left"
          >
            Eliminar todo el historial
          </button>
        )}
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">
            {user?.name || user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors shrink-0 ml-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-bg-light dark:bg-gray-950 overflow-hidden text-auteco-blue dark:text-gray-200 transition-colors duration-300">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setChatHistoryOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chats</span>
          </button>
          <button
            onClick={() => navigate('/workshop')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-pegasus-blue/10 text-pegasus-blue hover:bg-pegasus-blue/20 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Taller Pegasus</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="hidden sm:inline text-gray-600 dark:text-gray-300">
            Hola, {user?.name || 'Mecánico'}
          </span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">

        {/* Left: Chat + drawer overlay */}
        <div className="w-[40%] relative border-r border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-2xl z-10 bg-white dark:bg-gray-900/40 dark:backdrop-blur-sm flex flex-col overflow-hidden">

          {/* Chat history drawer */}
          {chatHistoryOpen && (
            <>
              <div
                className="absolute inset-0 bg-black/20 z-10"
                onClick={() => setChatHistoryOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-[270px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-20 flex flex-col shadow-2xl">
                <ChatHistoryDrawer />
              </aside>
            </>
          )}

          <ChatContainer />
        </div>

        {/* Right: Inventory / Admin / Queue */}
        <div className="w-[60%] flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-4 pt-4 pb-0 shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={() => setActivePanelDesktop('inventory')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                activePanelDesktop === 'inventory'
                  ? 'border-auteco-red text-auteco-red bg-red-50/50 dark:bg-red-900/10'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Bike className="w-4 h-4" />
              Inventario
            </button>
            <button
              onClick={() => setActivePanelDesktop('queue')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                activePanelDesktop === 'queue'
                  ? 'border-auteco-red text-auteco-red bg-red-50/50 dark:bg-red-900/10'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Wrench className="w-4 h-4" />
              En Reparación
            </button>
            {isAdmin && (
              <button
                onClick={() => setActivePanelDesktop('metrics')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                  activePanelDesktop === 'metrics'
                    ? 'border-auteco-red text-auteco-red bg-red-50/50 dark:bg-red-900/10'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Métricas Admin
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            {activePanelDesktop === 'metrics' && isAdmin && <AdminPage />}
            {activePanelDesktop === 'inventory' && <MotorcycleList />}
            {activePanelDesktop === 'queue' && <CompactMechanicQueue isGrid={true} />}
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">

        {/* Chat history overlay for mobile */}
        {chatHistoryOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-30"
              onClick={() => setChatHistoryOpen(false)}
            />
            <aside className="fixed left-0 top-0 h-full w-[270px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 flex flex-col">
              <ChatHistoryDrawer />
            </aside>
          </>
        )}

        <div className="flex-1 overflow-hidden">
          {mobileTab === 'chat' && <ChatContainer />}
          {mobileTab === 'inventory' && (
            <div className="h-full overflow-y-auto">
              <MotorcycleList />
            </div>
          )}
          {mobileTab === 'queue' && (
            <div className="h-full overflow-y-auto">
              <CompactMechanicQueue />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex justify-around items-center transition-colors duration-300 shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex flex-col items-center gap-1 ${mobileTab === 'chat' ? 'text-auteco-red font-bold' : 'text-gray-400 dark:text-gray-500'}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] uppercase">Chat IA</span>
          </button>
          <button
            onClick={() => setMobileTab('inventory')}
            className={`flex flex-col items-center gap-1 ${mobileTab === 'inventory' ? 'text-auteco-red font-bold' : 'text-gray-400 dark:text-gray-500'}`}
          >
            <Bike className="w-6 h-6" />
            <span className="text-[10px] uppercase">Motos</span>
          </button>
          <button
            onClick={() => setMobileTab('queue')}
            className={`flex flex-col items-center gap-1 ${mobileTab === 'queue' ? 'text-auteco-red font-bold' : 'text-gray-400 dark:text-gray-500'}`}
          >
            <Wrench className="w-6 h-6" />
            <span className="text-[10px] uppercase">Cola</span>
          </button>
          <button
            onClick={() => navigate('/workshop')}
            className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500"
          >
            <Plus className="w-6 h-6" />
            <span className="text-[10px] uppercase">Nuevo</span>
          </button>
        </div>
      </div>

      {/* ── DIALOGS ── */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 font-medium text-sm mb-6">
              ¿Estás seguro de que quieres eliminar esta conversación?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deletingId)} className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 font-medium text-sm mb-6">
              ¿Estás seguro? Esto eliminará todas las conversaciones.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteAll(false)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => { deleteAllConversations.mutate(); setConfirmDeleteAll(false); }}
                disabled={deleteAllConversations.isPending}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleteAllConversations.isPending ? 'Eliminando...' : 'Eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
