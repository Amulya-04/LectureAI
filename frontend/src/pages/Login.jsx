import { useState } from 'react';
import { authAPI } from '../api/client';

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      const { data } = await authAPI.login({ username: form.username, password: form.password });
      onLogin(data.user, data.token);
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed.');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      await authAPI.register({ username: form.username, password: form.password, role: form.role });
      setSuccess('Account created! You can now log in.');
      setTab('login');
      setForm(f => ({ ...f, password: '' }));
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
          <h1>LectureAI</h1>
          <p>Your personalised AI tutor, powered by Groq</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>Login</button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess(''); }}>Register</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-group">
          <label>Username</label>
          <input className="form-control" placeholder="Enter username" value={form.username} onChange={set('username')}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" className="form-control" placeholder="Enter password" value={form.password} onChange={set('password')}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())} />
        </div>

        {tab === 'register' && (
          <div className="form-group">
            <label>Role</label>
            <select className="form-control" value={form.role} onChange={set('role')}>
              <option value="student">🎒 Student</option>
              <option value="faculty">👩‍🏫 Faculty</option>
            </select>
          </div>
        )}

        <button className="btn btn-primary btn-full mt-2" disabled={loading || !form.username || !form.password}
          onClick={tab === 'login' ? handleLogin : handleRegister}>
          {loading ? <span className="spinner" /> : (tab === 'login' ? '🚀 Login' : '✨ Create Account')}
        </button>

        {tab === 'login' && (
          <p className="text-sm text-muted mt-2" style={{ textAlign: 'center' }}>
            Faculty? Use your faculty credentials to access the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
