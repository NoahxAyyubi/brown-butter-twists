import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const allowedEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'aol.com',
  'proton.me',
  'protonmail.com'
]);
const blockedWords = ['bullshit', 'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'idiot', 'stupid', 'dumbass', 'scam', 'spam'];
const spamSignals = ['crypto', 'forex', 'casino', 'viagra', 'telegram', 'http://', 'https://', 'www.', 'click here', 'whatsapp me'];

function isValidEmail(email) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  return allowedEmailDomains.has(trimmed.split('@').pop());
}

function isValidPhone(phone) {
  const digits = phone.trim().replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

function hasBlockedRequestText(value) {
  const normalized = value
    .toLowerCase()
    .replaceAll('@', 'a')
    .replaceAll('$', 's')
    .replaceAll('0', 'o')
    .replaceAll('1', 'i')
    .replaceAll('!', 'i')
    .replaceAll('3', 'e')
    .replaceAll('5', 's')
    .replaceAll('7', 't')
    .replace(/(.)\1{2,}/g, '$1$1');
  const compact = normalized.replace(/[\s._-]+/g, '');
  const hasBlockedWord = blockedWords.some((word) => {
    const wordPattern = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i');
    return wordPattern.test(normalized) || compact.includes(word);
  });
  return hasBlockedWord || spamSignals.some((signal) => normalized.includes(signal));
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Something went wrong.');
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setRoute(path);
  }

  return route.startsWith('/admin') ? <Admin navigate={navigate} /> : <PublicSite navigate={navigate} />;
}

function PublicSite({ navigate }) {
  const [tab, setTab] = useState('menu');
  const [items, setItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [config, setConfig] = useState({ ownerPhone: '(555) 123-4567' });
  const [status, setStatus] = useState('Loading menu...');

  useEffect(() => {
    api('/api/config').then(setConfig).catch(() => {});
    api('/api/menu')
      .then((data) => {
        setItems(data);
        setStatus('');
      })
      .catch((error) => setStatus(error.message));
  }, []);

  function addOrderItem(item) {
    setOrderItems((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
    setTab('order');
    window.scrollTo({ top: 420, behavior: 'smooth' });
  }

  function removeOrderItem(id) {
    setOrderItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <header className="hero-header">
        <button className="admin-link" onClick={() => navigate('/admin')}>Admin</button>
        <div className="hero-copy">
          <p>Home Bakery</p>
          <h1>Brown Butter Twists</h1>
        </div>
      </header>
      <main>
        <div className="tabs" role="tablist" aria-label="Bakery sections">
          <button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>Menu</button>
          <button className={tab === 'order' ? 'active' : ''} onClick={() => setTab('order')}>Order Request</button>
          <button className={tab === 'catering' ? 'active' : ''} onClick={() => setTab('catering')}>Catering Request</button>
        </div>
        {tab === 'menu' && <Menu items={items} orderItems={orderItems} status={status} onAdd={addOrderItem} />}
        {tab === 'order' && <OrderForm requestType="order" orderItems={orderItems} onRemoveItem={removeOrderItem} ownerPhone={config.ownerPhone} />}
        {tab === 'catering' && <OrderForm requestType="catering" orderItems={[]} ownerPhone={config.ownerPhone} />}
      </main>
    </>
  );
}

function itemImage(item) {
  return item.imageSrc || item.imageData || item.imageUrl || '';
}

function Menu({ items, orderItems, status, onAdd }) {
  const [infoItem, setInfoItem] = useState(null);

  if (status) return <p className="status">{status}</p>;

  return (
    <>
      <section className="menu-grid" aria-label="Bakery menu">
        {items.map((item) => (
          <article className="menu-card" key={item.id}>
            <div className="item-image">
              {itemImage(item) ? <img src={itemImage(item)} alt={item.name} /> : <span>{item.name.charAt(0)}</span>}
            </div>
            <div className="item-copy">
              <div>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
              </div>
              <div className="item-meta">
                <strong>{item.price}</strong>
                <span className={item.available ? 'badge available' : 'badge unavailable'}>
                  {item.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="card-actions">
                <button
                  className="primary"
                  disabled={!item.available || orderItems.some((entry) => entry.id === item.id)}
                  onClick={() => onAdd(item)}
                >
                  {orderItems.some((entry) => entry.id === item.id) ? 'Added' : 'Add to Order Request'}
                </button>
                <button onClick={() => setInfoItem(item)}>Info</button>
              </div>
            </div>
          </article>
        ))}
      </section>
      {infoItem && (
        <div className="modal-backdrop" role="presentation" onClick={() => setInfoItem(null)}>
          <section className="info-modal" role="dialog" aria-modal="true" aria-label={`${infoItem.name} details`} onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setInfoItem(null)}>Close</button>
            <img src={itemImage(infoItem)} alt={infoItem.name} />
            <h2>{infoItem.name}</h2>
            <p>{infoItem.description}</p>
            <p className="muted">Ingredients and allergy details will be added later.</p>
          </section>
        </div>
      )}
    </>
  );
}

function OrderForm({ requestType, orderItems, onRemoveItem, ownerPhone }) {
  const isCatering = requestType === 'catering';
  const [form, setForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    requestedDate: '',
    notes: ''
  });
  const [message, setMessage] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.email && !form.phone) {
      setMessage('Please add an email or phone number so the baker can reach you.');
      return;
    }
    if (!isValidEmail(form.email)) {
      setMessage('Please use a common email provider like Gmail, iCloud, Yahoo, Outlook, Hotmail, AOL, or Proton.');
      return;
    }
    if (!isValidPhone(form.phone)) {
      setMessage('Please use a 10 digit US phone number, or 11 digits if it starts with 1.');
      return;
    }
    if (form.notes.trim().length < 10) {
      setMessage('Please add at least 10 characters in additional details.');
      return;
    }
    if (hasBlockedRequestText(`${form.customerName} ${form.notes}`)) {
      setMessage('Please remove profanity, hostile language, links, or spam-like wording before sending.');
      return;
    }
    if (!isCatering && orderItems.length === 0) {
      setMessage('Please add at least one item from the menu first.');
      return;
    }

    setMessage('Sending request...');
    const requestedItems = isCatering ? [] : orderItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price
    }));

    try {
      await api('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          requestType,
          requestedItems,
          requestedItem: isCatering ? 'Catering request' : requestedItems.map((item) => item.name).join(', ')
        })
      });
      setMessage('Request sent. The bakery owner will follow up directly.');
      setForm({ customerName: '', email: '', phone: '', requestedDate: '', notes: '' });
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="form-shell">
      <form onSubmit={submit}>
        <h2>{isCatering ? 'Catering Request' : 'Order Request'}</h2>
        {!isCatering && (
          <div className="request-box">
            <h3>Requested items</h3>
            {orderItems.length === 0 ? (
              <p className="muted">No items added yet. Go to the menu and tap Add to Order Request.</p>
            ) : (
              orderItems.map((item) => (
                <div className="request-item" key={item.id}>
                  <span>{item.name}</span>
                  <button type="button" onClick={() => onRemoveItem(item.id)}>Remove</button>
                </div>
              ))
            )}
          </div>
        )}
        <p className="muted">
          This is a request only. The baker will review availability and contact you by email or phone.
          Payment details such as Zelle or another accepted method are shared only after the baker accepts the order.
        </p>
        <div className="form-grid">
          <label>Name<input value={form.customerName} onChange={(e) => update('customerName', e.target.value)} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
          <label>Phone<input value={form.phone} onChange={(e) => update('phone', e.target.value)} required /></label>
          <label>Ready by date<input type="date" value={form.requestedDate} onChange={(e) => update('requestedDate', e.target.value)} required /></label>
          <label className="wide">Additional details<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={isCatering ? '8' : '5'} minLength="10" required placeholder={isCatering ? 'Tell us the event date, guest count, item ideas, pickup/delivery context, and anything else the baker should know.' : 'Tell us any timing, pickup, allergy, flavor, or event details the baker should consider.'} /></label>
        </div>
        <button className="primary">Send request</button>
        <p className="form-note">Questions? Call {ownerPhone}</p>
        {message && <p className="status">{message}</p>}
      </form>
    </section>
  );
}

function Admin({ navigate }) {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [username, setUsername] = useState('Sarabakes');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  async function login(event) {
    event.preventDefault();
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAdminData() {
    const headers = { Authorization: `Bearer ${token}` };
    const [menuData, orderData] = await Promise.all([api('/api/admin/menu', { headers }), api('/api/admin/orders', { headers })]);
    setItems(menuData);
    setOrders(orderData);
  }

  useEffect(() => {
    if (token) loadAdminData().catch((error) => setMessage(error.message));
  }, [token]);

  async function saveItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const id = formData.get('id');
    const imageFile = formData.get('image');
    if (!id && (!imageFile || imageFile.size === 0) && !formData.get('imageUrl')) {
      setMessage('Please upload an image before posting this item.');
      return;
    }

    const endpoint = id ? `/api/admin/menu/${id}` : '/api/admin/menu';
    const method = id ? 'PUT' : 'POST';

    try {
      await api(endpoint, { method, headers: { Authorization: `Bearer ${token}` }, body: formData });
      form.reset();
      setEditing(null);
      await loadAdminData();
      setMessage('Menu updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function archiveItem(id) {
    await api(`/api/admin/menu/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAdminData();
  }

  async function repostItem(id) {
    await api(`/api/admin/menu/${id}/repost`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    await loadAdminData();
  }

  async function permanentlyDeleteItem(id) {
    const confirmed = window.confirm('Permanently delete this previous item? This cannot be undone.');
    if (!confirmed) return;
    await api(`/api/admin/menu/${id}/permanent`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAdminData();
  }

  if (!token) {
    return (
      <main className="admin-layout single">
        <form className="login-card" onSubmit={login}>
          <button type="button" className="back-button" onClick={() => navigate('/')}>Back to site</button>
          <h1>Admin Portal</h1>
          <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="primary">Log in</button>
          {message && <p className="status">{message}</p>}
        </form>
      </main>
    );
  }

  const activeItems = items.filter((item) => !item.archived);
  const previousItems = items.filter((item) => item.archived);

  return (
    <main className="admin-layout">
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h1>Menu Manager</h1>
            <p className="muted">Upload an image, set the details, and post it to the public menu.</p>
          </div>
          <div className="row-actions">
            <button onClick={() => navigate('/')}>View site</button>
            <button onClick={() => { localStorage.removeItem('adminToken'); setToken(''); }}>Log out</button>
          </div>
        </div>
        <form className="item-form" key={editing?.id || 'new-item'} onSubmit={saveItem}>
          <input type="hidden" name="id" value={editing?.id || ''} />
          <input type="hidden" name="archived" value={editing?.archived ? 'true' : 'false'} />
          <label>Name<input name="name" defaultValue={editing?.name || ''} required /></label>
          <label>Price<input name="price" defaultValue={editing?.price || ''} placeholder="6.50" required /></label>
          <label className="wide">Description<textarea name="description" defaultValue={editing?.description || ''} rows="3" /></label>
          <label>Availability
            <select name="available" defaultValue={editing ? String(editing.available) : 'true'}>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </label>
          <label>Image upload<input type="file" name="image" accept="image/*" required={!editing} /></label>
          <label className="wide">Image URL<input name="imageUrl" defaultValue={editing?.imageUrl || ''} placeholder="Optional if uploading an image" /></label>
          <button className="primary">{editing ? 'Save changes' : 'Post item'}</button>
          {editing && <button type="button" onClick={() => setEditing(null)}>Cancel edit</button>}
        </form>
        {message && <p className="status">{message}</p>}
        <AdminItems title="Current Menu" items={activeItems} onEdit={setEditing} onArchive={archiveItem} />
        <AdminItems title="Previous Items" items={previousItems} onEdit={setEditing} onRepost={repostItem} onPermanentDelete={permanentlyDeleteItem} />
      </section>
      <section className="admin-panel">
        <h2>Recent Requests</h2>
        <div className="admin-list">
          {orders.length === 0 && <p className="muted">No requests yet.</p>}
          {orders.map((order) => (
            <article key={order.id} className="admin-row order-row">
              <strong>{order.customerName}</strong>
              <p>{order.requestType || 'order'} · {order.requestedItem} for {new Date(order.requestedDate).toLocaleDateString()}</p>
              <p>{order.email} · {order.phone}</p>
              {order.notes && <p>{order.notes}</p>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminItems({ title, items, onEdit, onArchive, onRepost, onPermanentDelete }) {
  return (
    <section className="admin-section">
      <h2>{title}</h2>
      <div className="admin-list">
        {items.length === 0 && <p className="muted">Nothing here yet.</p>}
        {items.map((item) => (
          <article key={item.id} className="admin-row">
            <img src={itemImage(item)} alt={item.name} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.price} · {item.available ? 'Available' : 'Unavailable'}</p>
            </div>
            <div className="row-actions">
              <button onClick={() => onEdit(item)}>Edit</button>
              {onArchive && <button onClick={() => onArchive(item.id)}>Move to previous</button>}
              {onRepost && <button className="primary" onClick={() => onRepost(item.id)}>Repost</button>}
              {onPermanentDelete && <button className="danger-button" onClick={() => onPermanentDelete(item.id)}>Delete forever</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
