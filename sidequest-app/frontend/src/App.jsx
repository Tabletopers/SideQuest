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

  useEffect(() => {
    fetchUsers();
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

  const avgLat = users.length ? users.reduce((s, u) => s + u.latitude, 0) / users.length : 37.7749;
  const avgLng = users.length ? users.reduce((s, u) => s + u.longitude, 0) / users.length : -122.4194;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏖️ SideQuest</h1>
        <p>The Ultimate Summer App</p>
      </header>

      <nav className="app-nav">
        <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>🗺️ Map</button>
        <button className={view === 'friends' ? 'active' : ''} onClick={() => setView('friends')}>👥 Friends</button>
        <button className={view === 'spin' ? 'active' : ''} onClick={() => setView('spin')}>🎰 Spinner</button>
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
                  {user.email}
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
                  <strong>{user.name}</strong>
                  <div className="coords">
                    {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                  </div>
                </div>
                <button className="delete-btn" onClick={() => deleteUser(user.id)}>✕</button>
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
            <button className="spin-btn" onClick={spinWheel} disabled={spinning}>
              {spinning ? 'Spinning...' : 'SPIN!'}
            </button>
            {sidequest && (
              <div className="sidequest-result">
                <h2>{sidequest.reward} {sidequest.title}</h2>
                <p>{sidequest.description}</p>
              </div>
            )}
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
