import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

const STORAGE_KEY = 'wms-sidebar-collapsed';

export function Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className={styles.layout} data-sidebar-collapsed={collapsed}>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
