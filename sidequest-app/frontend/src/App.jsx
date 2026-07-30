import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_BASE = '/api';

function RecenterMap({ center }) {
  const map = useMap();
  if (center) map.setView(center, 13);
  return null;
}

function getTitleForLevel(level) {
  if (level >= 20) return 'Summer Legend';
  if (level >= 15) return 'Beach Boss';
  if (level >= 10) return 'Sun Chaser';
  if (level >= 5) return 'Pool Shark';
  return 'Sunbather';
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [lat, setLat] = useState(37.7749);
  const [lng, setLng] = useState(-122.4194);
  const [loading, setLoading] = useState(false);
  const [sidequest, setSidequest] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [mapCenter, setMapCenter] = useState(null);
  const [view, setView] = useState('map');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sidequest_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [sidequestTitle, setSidequestTitle] = useState('');
  const [sidequestDesc, setSidequestDesc] = useState('');
  const [submittingQuest, setSubmittingQuest] = useState(false);
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showTikTok, setShowTikTok] = useState(false);
  const [verifications, setVerifications] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchVerifications();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchVerifications() {
    try {
      const res = await fetch(`${API_BASE}/verifications?user_id=${currentUser?.id || ''}`);
      const data = await res.json();
      setVerifications(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function addUser(e) {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, latitude: Number(lat), longitude: Number(lng) }),
      });
      const user = await res.json();
      setCurrentUser(user);
      localStorage.setItem('sidequest_user', JSON.stringify(user));
      setUsers((prev) => [...prev, user]);
      setName('');
      setEmail('');
      setView('map');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    try {
      await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (currentUser?.id === id) {
        setCurrentUser(null);
        localStorage.removeItem('sidequest_user');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function spinWheel() {
    setSpinning(true);
    setSpinRotation((prev) => prev + 720);
    try {
      const res = await fetch(`${API_BASE}/sidequests?count=1`);
      const data = await res.json();
      setTimeout(() => {
        setSidequest(data[0] || null);
        setSpinning(false);
      }, 1500);
    } catch (e) {
      setSpinning(false);
    }
  }

  async function submitSidequest(e) {
    e.preventDefault();
    if (!sidequestTitle || !currentUser) return;
    setSubmittingQuest(true);
    try {
      await fetch(`${API_BASE}/sidequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sidequestTitle, description: sidequestDesc, created_by: currentUser.id }),
      });
      setSidequestTitle('');
      setSidequestDesc('');
      setView('map');
      alert('SideQuest submitted! Wait for it to be approved by the crew.');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingQuest(false);
    }
  }

  async function verifySidequest() {
    if (!sidequest || !currentUser) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/sidequests/${sidequest.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, tiktok_url: tiktokUrl }),
      });
      const data = await res.json();
      if (data.newXp) {
        setCurrentUser((prev) => ({ ...prev, xp: data.newXp.xp, level: data.newXp.level }));
      }
      setTiktokUrl('');
      setShowTikTok(false);
      setSidequest(null);
      fetchVerifications();
      alert(`+${data.xpAwarded} XP!`);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  }

  const avgLat = users.length ? users.reduce((s, u) => s + u.latitude, 0) / users.length : 37.7749;
  const avgLng = users.length ? users.reduce((s, u) => s + u.longitude, 0) / users.length : -122.4194;

  const xpNeeded = currentUser ? (currentUser.level || 1) * 100 : 100;
  const currentXp = currentUser?.xp || 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏖️ SideQuest</h1>
        <p>The Ultimate Summer App</p>
        {currentUser && (
          <div className="xp-bar-container">
            <div className="xp-text">Level {currentUser.level} {currentUser.level >= 5 && <span className="title-badge">{getTitleForLevel(currentUser.level)}</span>}</div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${Math.min((currentXp / xpNeeded) * 100, 100)}%` }}></div>
            </div>
            <div className="xp-text small">{currentXp} / {xpNeeded} XP</div>
          </div>
        )}
      </header>

      <nav className="app-nav">
        <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>🗺️ Map</button>
        <button className={view === 'friends' ? 'active' : ''} onClick={() => setView('friends')}>👥 Friends</button>
        <button className={view === 'spin' ? 'active' : ''} onClick={() => setView('spin')}>🎰 Spinner</button>
        {currentUser && <button className={view === 'addquest' ? 'active' : ''} onClick={() => setView('addquest')}>➕ Add Quest</button>}
      </nav>

      {view === 'map' && (
        <div className="view">
          <MapContainer center={[avgLat, avgLng]} zoom={13} className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap center={mapCenter} />
            {users.map((user) => (
              <Marker key={user.id} position={[user.latitude, user.longitude]}>
                <Popup>
                  <strong>{user.name}</strong><br />
                  {user.email}<br />
                  <div style={{ marginTop: 4 }}>
                    <span style={{ background: '#ff6b35', color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>
                      Lvl {user.level || 1} • {user.xp || 0} XP
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {view === 'friends' && (
        <div className="view">
          <div className="friends">
            {users.map((user) => (
              <div key={user.id} className="friend-card">
                <div>
                  <strong>{user.name} {user.id === currentUser?.id && '(You)'}</strong>
                  <div className="coords">
                    {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                  </div>
                  <div className="xp-badge">Lvl {user.level || 1} • {user.xp || 0} XP • {getTitleForLevel(user.level || 1)}</div>
                </div>
                {user.id === currentUser?.id && (
                  <button className="delete-btn" onClick={() => deleteUser(user.id)}>✕</button>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="empty">No friends yet. Add some!</p>}
          </div>
        </div>
      )}

      {view === 'spin' && (
        <div className="view">
          <div className="spinner-section">
            <div className={`wheel ${spinning ? 'spinning' : ''}`} style={{ transform: `rotate(${spinRotation}deg)` }}>
              <div className="wheel-inner">🎰</div>
            </div>
            <button className="spin-btn" onClick={spinWheel} disabled={spinning || !currentUser}>
              {!currentUser ? 'Add yourself first' : spinning ? 'Spinning...' : 'SPIN!'}
            </button>
            {sidequest && (
              <div className="sidequest-result">
                <h2>{sidequest.reward} {sidequest.title}</h2>
                <p>{sidequest.description}</p>
                {sidequest.tiktok_url && (
                  <a href={sidequest.tiktok_url} target="_blank" rel="noreferrer" className="tiktok-link">
                    📱 Watch TikTok Demo
                  </a>
                )}
                {currentUser && (
                  <div style={{ marginTop: '1rem' }}>
                    {!showTikTok ? (
                      <button className="verify-btn" onClick={() => setShowTikTok(true)}>
                        ✅ Verify Completed (+50 XP)
                      </button>
                    ) : (
                      <div className="verify-form">
                        <input
                          type="url"
                          placeholder="Paste TikTok video URL"
                          value={tiktokUrl}
                          onChange={(e) => setTiktokUrl(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="verify-btn" onClick={verifySidequest} disabled={verifying || !tiktokUrl}>
                            {verifying ? 'Verifying...' : 'Submit Verification'}
                          </button>
                          <button className="close-btn" onClick={() => setShowTikTok(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'addquest' && currentUser && (
        <div className="view">
          <div className="add-quest-container">
            <h2>➕ Add SideQuest to the Wheel</h2>
            <p className="subtitle">Create a new challenge for everyone. Approved sidequests appear on the spinner!</p>
            <form onSubmit={submitSidequest} className="quest-form">
              <input
                type="text"
                placeholder="Quest title (e.g., Sunset picnic)"
                value={sidequestTitle}
                onChange={(e) => setSidequestTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="What do you have to do?"
                value={sidequestDesc}
                onChange={(e) => setSidequestDesc(e.target.value)}
                rows={4}
              />
              <input
                type="url"
                placeholder="TikTok demo URL (optional)"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
              />
              <button type="submit" disabled={submittingQuest}>
                {submittingQuest ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="fab" onClick={() => setView('add')}>+</div>

      {view === 'add' && (
        <div className="modal-overlay" onClick={() => setView('map')}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Friend</h2>
            <form onSubmit={addUser}>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
              <button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Friend'}</button>
            </form>
            <button className="close-btn" onClick={() => setView('map')}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
