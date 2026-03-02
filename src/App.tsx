import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, SearchCode, Code2 } from 'lucide-react';
import { CelEditorTab } from './components/CelEvaluator/CelEditorTab';
import { JwtDecoder } from './components/JwtDecoder/JwtDecoder';
import './App.css';

// Placeholder Pages
const Home = () => (
  <div className="page-content">
    <div className="page-header">
      <h2 className="page-title text-glow">Security Showcase</h2>
      <p className="page-description">Explore modern in-browser security applications and tools.</p>
    </div>

    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
      <ShieldCheck size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
      <h3>Welcome to rbac.io</h3>
      <p style={{ color: 'var(--text-muted)', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto' }}>
        This platform provides interactive demonstrations of browser-based security features,
        cryptographic operations, and identity standards. Select an application from the sidebar to begin.
      </p>
    </div>
  </div>
);

const CelPlayground = () => (
  <div className="page-content" style={{ padding: 0 }}>
    <CelEditorTab />
  </div>
);



const Layout = () => {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <h1>
          <ShieldCheck size={28} color="var(--primary)" />
          rbac.io
        </h1>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <LockKeyhole size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/cel" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Code2 size={20} />
            <span>CEL Playground</span>
          </NavLink>
          <NavLink to="/jwt" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <SearchCode size={20} />
            <span>JWT Decoder</span>
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          &copy; {new Date().getFullYear()} rbac.io
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="cel" element={<CelPlayground />} />
          <Route path="jwt" element={<JwtDecoder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
