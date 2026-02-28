import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, SearchCode, Code2, Network } from 'lucide-react';
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

const JwtDecoder = () => (
  <div className="page-content">
    <div className="page-header">
      <h2 className="page-title">JWT Decoder</h2>
      <p className="page-description">Inspect and validate JSON Web Tokens directly in the browser.</p>
    </div>
    <div className="showcase-grid">
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Encoded Token</h3>
        <textarea
          placeholder="Paste your JWT here..."
          style={{ width: '100%', height: '200px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', padding: '1rem', fontFamily: 'monospace', resize: 'vertical' }}
        />
      </div>
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Decoded Payload</h3>
        <pre style={{ flex: 1, minHeight: '200px', margin: 0 }}>
          {`{\n  \"alg\": \"HS256\",\n  \"typ\": \"JWT\"\n}\n\n...\n\n// Payload will appear here`}
        </pre>
      </div>
    </div>
  </div>
);

const CelEvaluator = () => (
  <div className="page-content">
    <div className="page-header">
      <h2 className="page-title">CEL Evaluator</h2>
      <p className="page-description">Write, test, and evaluate Common Expression Language (CEL) expressions.</p>
    </div>
    <div className="showcase-grid">
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Expression & Inputs</h3>
        <textarea
          placeholder="e.g. request.auth.claims.group == 'admin'"
          style={{ width: '100%', height: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-code)', padding: '1rem', fontFamily: 'monospace', resize: 'vertical' }}
        />
        <textarea
          placeholder="Variables (JSON)..."
          style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', padding: '1rem', fontFamily: 'monospace', resize: 'vertical' }}
        />
        <button style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>Evaluate</button>
      </div>
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Result</h3>
        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', flex: 1 }}>
          <span style={{ color: 'var(--text-muted)' }}>Awaiting execution...</span>
        </div>
      </div>
    </div>
  </div>
);

const CelAstViewer = () => (
  <div className="page-content">
    <div className="page-header">
      <h2 className="page-title">CEL AST Viewer</h2>
      <p className="page-description">Visualize the Abstract Syntax Tree (AST) generated from CEL expressions.</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Enter CEL expression to parse..."
          style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-code)', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}
        />
        <button>Generate AST</button>
      </div>
      <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
          <Network size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <p>AST Visualization will render here</p>
        </div>
      </div>
    </div>
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
          <NavLink to="/jwt" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <SearchCode size={20} />
            <span>JWT Decoder</span>
          </NavLink>
          <NavLink to="/cel-evaluator" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Code2 size={20} />
            <span>CEL Evaluator</span>
          </NavLink>
          <NavLink to="/cel-ast" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Network size={20} />
            <span>CEL AST Viewer</span>
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          &copy; {new Date().getFullYear()} rbac.io
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          {/* Top header area for actions/profile icon if needed */}
        </header>
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
          <Route path="jwt" element={<JwtDecoder />} />
          <Route path="cel-evaluator" element={<CelEvaluator />} />
          <Route path="cel-ast" element={<CelAstViewer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
