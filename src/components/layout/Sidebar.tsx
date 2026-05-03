import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  Store,
  ArrowRightLeft,
  PackagePlus,
  Package,
  ScrollText,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { LOCAIS_QUIOSQUE } from '../../store/wmsStore';
import { useAuthStore } from '../../store/authStore';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const [quiosquesOpen, setQuiosquesOpen] = useState(true);
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      alert((err as Error).message || 'Erro ao sair');
    }
  };

  const SLUG_MAP: Record<string, string> = {
    'Mariano': 'mariano',
    'Chapada': 'chapada',
    'Mufatto': 'mufatto',
    'Oficinas': 'oficinas',
  };

  const ICON_SIZE = 18;

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      <div className={styles.logo}>
        <img src="/bobs-logo.svg" alt="Bobs Logo" className={styles.logoIcon} />
        {/* <h5>WMS Bobs</h5> */}
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          title="Dashboard"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <LayoutDashboard size={ICON_SIZE} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/estoque-cd"
          title="Estoque CD"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Warehouse size={ICON_SIZE} />
          <span>Estoque CD</span>
        </NavLink>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionTitle}
            onClick={() => setQuiosquesOpen(!quiosquesOpen)}
            title="Quiosques"
          >
            <span className={styles.sectionLabel}>
              <Store size={ICON_SIZE} />
              <span>Quiosques</span>
            </span>
            <ChevronRight
              size={16}
              className={`${styles.chevron} ${quiosquesOpen ? styles.open : ''}`}
            />
          </button>
          {quiosquesOpen && !collapsed && (
            <div className={styles.submenu}>
              {LOCAIS_QUIOSQUE.map((local) => (
                <NavLink
                  key={local}
                  to={`/quiosque/${SLUG_MAP[local]}`}
                  className={({ isActive }) =>
                    `${styles.submenuItem} ${isActive ? styles.active : ''}`
                  }
                >
                  {local}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink
          to="/transferencia"
          title="Transferência"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <ArrowRightLeft size={ICON_SIZE} />
          <span>Transferência</span>
        </NavLink>

        <NavLink
          to="/entrada-cd"
          title="Entrada CD"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <PackagePlus size={ICON_SIZE} />
          <span>Entrada CD</span>
        </NavLink>

        <NavLink
          to="/produtos"
          title="Produtos"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Package size={ICON_SIZE} />
          <span>Produtos</span>
        </NavLink>

        <NavLink
          to="/movimentacoes"
          title="Movimentações"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <ScrollText size={ICON_SIZE} />
          <span>Movimentações</span>
        </NavLink>
      </nav>

      <div className={styles.footer}>
        {user?.email && <div className={styles.userEmail}>{user.email}</div>}
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleSignOut}
          title={user?.email ? `Sair (${user.email})` : 'Sair'}
        >
          <LogOut size={ICON_SIZE} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
