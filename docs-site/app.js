import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ---------------------------------------------------------------------------
// 1. STATIC CATALOG & SAMPLE SHOWCASE STUDIOS
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { slug: 'makeup', name: 'Makeup', group: 'beauty', image: './images/categories/makeup.jpg', sub: 'Bridal, editorial, HD & airbrush artistry' },
  { slug: 'hair', name: 'Hair', group: 'beauty', image: './images/categories/hair.jpg', sub: 'Bridal styling, cuts, blowouts & care' },
  { slug: 'mehendi', name: 'Mehendi', group: 'beauty', image: './images/categories/mehendi.jpg', sub: 'Bridal, Arabic & minimal fine-line henna' },
  { slug: 'nails', name: 'Nails', group: 'beauty', image: './images/categories/nails.jpg', sub: 'Gel extensions, nail art & clean care' },
  { slug: 'skincare-beauty', name: 'Skincare & Beauty', group: 'beauty', image: './images/categories/skincare.jpg', sub: 'Pre-event facials, brows & glow rituals' },
  { slug: 'styling', name: 'Styling', group: 'creative', image: './images/categories/styling.jpg', sub: 'Wardrobe curation, trousseau & shoots' },
  { slug: 'fashion-design', name: 'Fashion Design', group: 'creative', image: './images/categories/fashion.jpg', sub: 'Bespoke couture, bridalwear & tailoring' },
  { slug: 'interior-design', name: 'Interior Design', group: 'creative', image: './images/categories/interior.jpg', sub: 'Residential styling, room makeovers & decor' },
  { slug: 'graphic-design', name: 'Graphic Design', group: 'creative', image: './images/categories/graphic.jpg', sub: 'Brand identity, invitations & print systems' },
  { slug: 'photography', name: 'Photography', group: 'creative', image: './images/categories/photography.jpg', sub: 'Weddings, portraits & brand lookbooks' }
];

const SAMPLE_PROS = [
  {
    uid: 'sample-lumiere',
    businessName: 'Atelier Lumière Makeup Studio',
    displayName: 'Ananya Verma',
    headline: 'Bridal HD & Editorial Makeup Artist',
    bio: 'Specialising in luminous skin-first bridal looks, waterproof airbrush finishes, and soft-glam reception styling with 8+ years of experience.',
    categories: ['makeup', 'hair'],
    location: { city: 'Bengaluru', locality: 'Indiranagar' },
    serviceModes: ['at_home', 'at_studio'],
    serviceRadiusKm: 20,
    experienceYears: 8,
    isVerified: true,
    profileStatus: 'active',
    ratingAverage: 4.9,
    reviewCount: 42,
    productsUsed: ['MAC Cosmetics', 'Huda Beauty', 'Charlotte Tilbury', 'NARS', 'Temptu Airbrush'],
    productsSummary: '100% authentic luxury kits with single-use mascara wands, lip applicators, and hospital-grade brush sanitisation.',
    services: [
      { id: 's1', name: 'Signature Bridal HD Makeup & Draping', priceMin: 18500, durationMinutes: 150, description: 'Full skin prep, HD base, custom eye look, hair styling, and saree/dupatta draping.' },
      { id: 's2', name: 'Party & Reception Soft Glam', priceMin: 6500, durationMinutes: 90, description: 'Long-wear radiant makeup and soft waves for family & guests.' },
      { id: 's3', name: 'Bridal Trial Consultation', priceMin: 3500, durationMinutes: 75, description: 'In-studio shade matching, undertone test, and look planning.' }
    ],
    isSampleData: true
  },
  {
    uid: 'sample-henna',
    businessName: 'Fine-Line Henna Collective',
    displayName: 'Rukhsar Khan',
    headline: 'Organic Bridal & Contemporary Mehendi Studio',
    bio: 'Intricate Rajasthani storytelling motifs, minimal Arabic trails, and custom couple portraits crafted with freshly milled organic henna.',
    categories: ['mehendi'],
    location: { city: 'Mumbai', locality: 'Bandra West' },
    serviceModes: ['at_home', 'at_studio'],
    serviceRadiusKm: 25,
    experienceYears: 10,
    isVerified: true,
    profileStatus: 'active',
    ratingAverage: 4.95,
    reviewCount: 68,
    productsUsed: ['Organic Sojat Henna', 'Pure Nilgiri Eucalyptus Oil', 'Clove Essential Oil'],
    productsSummary: 'Zero chemical dyes or PPD. Freshly sifted triple-filtered Sojat henna mixed daily for rich dark maroon stain.',
    services: [
      { id: 'm1', name: 'Full Bridal Mehendi (Hands & Feet)', priceMin: 12000, durationMinutes: 240, description: 'Detailed elbow-length bridal hands and knee/ankle feet patterns with custom motifs.' },
      { id: 'm2', name: 'Engagement / Sangeet Guest Package (Per Hour)', priceMin: 2800, durationMinutes: 60, description: 'Fast, neat Arabic and floral strips for wedding guests.' }
    ],
    isSampleData: true
  },
  {
    uid: 'sample-veda',
    businessName: 'Studio Veda Interiors',
    displayName: 'Kabir Malhotra',
    headline: 'Warm Minimalist Home & Boutique Styling',
    bio: 'End-to-end room makeovers, custom furniture sourcing, lighting curation, and turnkey residential interior styling tailored to your budget.',
    categories: ['interior-design'],
    location: { city: 'New Delhi', locality: 'Hauz Khas' },
    serviceModes: ['at_home', 'remote'],
    serviceRadiusKm: 35,
    experienceYears: 7,
    isVerified: true,
    profileStatus: 'active',
    ratingAverage: 4.85,
    reviewCount: 29,
    productsUsed: ['Asian Paints Royale', 'Dulux Velvet Touch', 'Jaipur Rugs', 'Philips Hue Lighting'],
    productsSummary: 'Low-VOC eco-certified finishes, kiln-dried teak woodwork, and curated Indian artisan textiles.',
    services: [
      { id: 'i1', name: '1-Room Concept & Moodboard Design', priceMin: 14000, durationMinutes: 120, description: '2D furniture layout, colour palette, lighting plan, and shoppable material list.' },
      { id: 'i2', name: 'Full Home Styling Consultation', priceMin: 35000, durationMinutes: 180, description: 'Complete multi-room walkthrough, vendor quotes, and execution roadmap.' }
    ],
    isSampleData: true
  },
  {
    uid: 'sample-quietlight',
    businessName: 'Quiet Light Photography',
    displayName: 'Meera Nair',
    headline: 'Editorial Portraits, Intimate Weddings & Lookbooks',
    bio: 'Documentary-style wedding storytelling, natural-light portrait sessions, and clean commercial lookbooks for independent fashion & beauty labels.',
    categories: ['photography'],
    location: { city: 'Bengaluru', locality: 'Koramangala' },
    serviceModes: ['at_home', 'at_studio'],
    serviceRadiusKm: 40,
    experienceYears: 6,
    isVerified: true,
    profileStatus: 'active',
    ratingAverage: 4.9,
    reviewCount: 37,
    productsUsed: ['Sony Alpha A7RV', 'Sony GM 35mm & 85mm', 'Profoto B10X Lighting', 'Capture One Pro'],
    productsSummary: 'Full-frame dual-card backup workflow with colour-calibrated archival editing and private online gallery delivery.',
    services: [
      { id: 'p1', name: 'Half-Day Portrait / Couple Session', priceMin: 16000, durationMinutes: 240, description: 'Up to 60 colour-graded high-resolution images with location guidance.' },
      { id: 'p2', name: 'Intimate Wedding / Engagement Coverage', priceMin: 38000, durationMinutes: 480, description: 'Full event coverage, candid storytelling, and curated print-ready gallery.' }
    ],
    isSampleData: true
  }
];

// ---------------------------------------------------------------------------
// 2. APP STATE & FIREBASE INITIALISATION
// ---------------------------------------------------------------------------
const state = {
  firebaseReady: false,
  app: null,
  auth: null,
  db: null,
  user: null,
  userRecord: null,
  isAdmin: false,
  activeView: 'home', // 'home' | 'bookings' | 'pro' | 'admin'
  catGroupFilter: 'all',
  catQuery: '',
  proCategoryFilter: 'all',
  proQuery: '',
  professionals: [],
  myBookings: [],
  proProfile: null,
  proServices: [],
  proBookings: [],
  adminUsers: [],
  adminPros: [],
  adminBookings: [],
  pendingBooking: null, // { pro, service }
  selectedProModal: null
};

function getEffectiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('veyra_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) return parsed;
    }
  } catch (_) {}
  const cfg = window.VEYRA_FIREBASE_CONFIG;
  if (cfg && cfg.apiKey && cfg.projectId && !cfg.apiKey.includes('your-')) return cfg;
  return null;
}

function initFirebase() {
  const cfg = getEffectiveFirebaseConfig();
  if (!cfg) {
    state.firebaseReady = false;
    updateConfigStatusUI();
    return false;
  }
  try {
    state.app = getApps().length ? getApps()[0] : initializeApp(cfg);
    state.auth = getAuth(state.app);
    state.db = getFirestore(state.app);
    state.firebaseReady = true;
    onAuthStateChanged(state.auth, handleAuthChange);
    updateConfigStatusUI();
    return true;
  } catch (err) {
    console.error('Firebase init error:', err);
    state.firebaseReady = false;
    updateConfigStatusUI();
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. HELPERS
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

function showToast(msg, tone = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.dataset.tone = tone;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), 3800);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll('.app-view').forEach((v) => {
    v.hidden = v.dataset.view !== view;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'bookings') loadCustomerBookings();
  if (view === 'pro') loadProDashboard();
  if (view === 'admin') loadAdminDashboard();
}

function updateConfigStatusUI() {
  const badge = document.getElementById('firebaseStatusBadge');
  if (badge) {
    badge.textContent = state.firebaseReady ? 'Live Cloud Connected' : 'Showcase Mode (Connect Firebase in Admin)';
    badge.className = state.firebaseReady ? 'status-pill ok' : 'status-pill warn';
  }
}

// ---------------------------------------------------------------------------
// 4. AUTHENTICATION HANDLERS
// ---------------------------------------------------------------------------
async function handleAuthChange(user) {
  state.user = user;
  state.userRecord = null;
  state.isAdmin = false;

  if (user && state.db) {
    try {
      const tokenResult = await user.getIdTokenResult();
      state.isAdmin = tokenResult.claims?.admin === true;
      const uSnap = await getDoc(doc(state.db, 'users', user.uid));
      if (uSnap.exists()) {
        state.userRecord = uSnap.data();
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
  }

  renderNavAuth();
  await loadPublicProfessionals();

  if (state.pendingBooking && user) {
    const pending = state.pendingBooking;
    state.pendingBooking = null;
    closeModal('authModal');
    openBookingModal(pending.pro, pending.service);
  }

  if (state.activeView === 'bookings') loadCustomerBookings();
  if (state.activeView === 'pro') loadProDashboard();
  if (state.activeView === 'admin') loadAdminDashboard();
}

function renderNavAuth() {
  const slot = document.getElementById('navAuthSlot');
  if (!slot) return;
  if (!state.user) {
    slot.innerHTML = `
      <button type="button" class="btn btn-ghost" data-open-auth="signin">Sign In</button>
      <button type="button" class="btn btn-primary" data-open-auth="register-pro">Join as Professional</button>
    `;
    return;
  }
  const role = state.userRecord?.role || 'customer';
  const name = escapeHtml(state.userRecord?.displayName || state.user.displayName || state.user.email || 'Account');
  slot.innerHTML = `
    <button type="button" class="btn btn-ghost" data-nav-view="bookings">My Bookings</button>
    ${role === 'professional' ? `<button type="button" class="btn btn-soft" data-nav-view="pro">Pro Dashboard</button>` : ''}
    ${state.isAdmin ? `<button type="button" class="btn btn-soft" data-nav-view="admin">Admin</button>` : ''}
    <span class="user-chip" title="${name}">${name}</span>
    <button type="button" class="btn btn-ghost" id="logoutBtn">Sign Out</button>
  `;
}

function openAuthModal(mode = 'signin', role = 'customer') {
  const form = document.getElementById('authForm');
  if (!form) return;
  form.dataset.mode = mode;
  document.getElementById('authModeSelect').value = mode;
  document.getElementById('authRoleSelect').value = role;
  syncAuthFormFields();
  openModal('authModal');
}

function syncAuthFormFields() {
  const mode = document.getElementById('authModeSelect').value;
  const role = document.getElementById('authRoleSelect').value;
  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  document.getElementById('authNameGroup').hidden = !isRegister;
  document.getElementById('authRoleGroup').hidden = !isRegister;
  document.getElementById('authShopGroup').hidden = !(isRegister && role === 'professional');
  document.getElementById('authPasswordGroup').hidden = isReset;
  document.getElementById('authPasswordInput').required = !isReset;
  document.getElementById('authSubmitBtn').textContent =
    isReset ? 'Send Password Reset Email' : isRegister ? 'Create VEYRA Account' : 'Sign In';
  document.getElementById('authModalTitle').textContent =
    isReset ? 'Reset Password' : isRegister ? 'Create Your VEYRA Account' : 'Welcome Back to VEYRA';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!state.firebaseReady) {
    showToast('Connect your Firebase project in Admin -> Firebase Setup to enable live accounts.', 'error');
    return;
  }
  const mode = document.getElementById('authModeSelect').value;
  const role = document.getElementById('authRoleSelect').value;
  const email = document.getElementById('authEmailInput').value.trim();
  const password = document.getElementById('authPasswordInput').value;
  const displayName = document.getElementById('authNameInput').value.trim();
  const shopName = document.getElementById('authShopInput').value.trim();
  const errEl = document.getElementById('authErrorMsg');
  errEl.hidden = true;

  try {
    if (mode === 'reset') {
      await sendPasswordResetEmail(state.auth, email);
      showToast('Password reset link sent to your email.', 'success');
      closeModal('authModal');
      return;
    }

    if (mode === 'signin') {
      await signInWithEmailAndPassword(state.auth, email, password);
      showToast('Signed in successfully.', 'success');
      closeModal('authModal');
      return;
    }

    // Register
    const cred = await createUserWithEmailAndPassword(state.auth, email, password);
    const now = new Date().toISOString();
    const finalName = displayName || email.split('@')[0];
    await updateProfile(cred.user, { displayName: finalName });

    await setDoc(doc(state.db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      role,
      displayName: finalName,
      email,
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now
    });

    if (role === 'professional') {
      await setDoc(doc(state.db, 'professionalProfiles', cred.user.uid), {
        uid: cred.user.uid,
        displayName: finalName,
        businessName: shopName || `${finalName} Studio`,
        headline: 'Independent Beauty & Creative Professional',
        bio: '',
        categories: ['makeup'],
        location: { city: '', locality: '', country: 'India' },
        serviceModes: ['at_home'],
        serviceRadiusKm: 15,
        experienceYears: 1,
        productsUsed: [],
        productsSummary: '',
        services: [],
        isVerified: false,
        verificationStatus: 'not_submitted',
        isFeatured: false,
        ratingAverage: 0,
        reviewCount: 0,
        completedBookingsCount: 0,
        profileStatus: 'active',
        createdAt: now,
        updatedAt: now
      });
      showToast('Professional account created! Complete your Shop Profile in the Pro Dashboard.', 'success');
      closeModal('authModal');
      switchView('pro');
    } else {
      await setDoc(doc(state.db, 'customerProfiles', cred.user.uid), {
        uid: cred.user.uid,
        displayName: finalName,
        createdAt: now,
        updatedAt: now
      });
      showToast('Customer account created!', 'success');
      closeModal('authModal');
    }
  } catch (err) {
    errEl.textContent = err?.message || 'Authentication failed.';
    errEl.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// 5. PUBLIC USER MARKETPLACE (NO LOGIN REQUIRED TO BROWSE)
// ---------------------------------------------------------------------------
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  const countEl = document.getElementById('categoryCountLabel');
  if (!grid) return;

  const q = state.catQuery.trim().toLowerCase();
  const filtered = CATEGORIES.filter((c) => {
    const matchGroup = state.catGroupFilter === 'all' || c.group === state.catGroupFilter;
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q);
    return matchGroup && matchQ;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'category' : 'categories'}`;
  }

  grid.innerHTML = filtered.length
    ? filtered
        .map(
          (cat) => `
      <article class="cat-card" data-select-category="${cat.slug}">
        <img src="${cat.image}" alt="${escapeHtml(cat.name)}" loading="lazy" />
        <div class="cat-card-body">
          <h3>${escapeHtml(cat.name)}</h3>
          <p>${escapeHtml(cat.sub)}</p>
        </div>
      </article>`
        )
        .join('')
    : `<div class="empty-box">No categories matched "${escapeHtml(state.catQuery)}".</div>`;
}

async function loadPublicProfessionals() {
  let livePros = [];
  if (state.firebaseReady && state.db) {
    try {
      const q = query(
        collection(state.db, 'professionalProfiles'),
        where('profileStatus', '==', 'active'),
        limit(40)
      );
      const snap = await getDocs(q);
      livePros = snap.docs.map((d) => ({ ...d.data(), uid: d.id, isSampleData: false }));
    } catch (err) {
      console.warn('Could not load live professionals:', err);
    }
  }
  state.professionals = livePros.length ? livePros : SAMPLE_PROS;
  renderProfessionalsDirectory();
}

function renderProfessionalsDirectory() {
  const grid = document.getElementById('professionalsGrid');
  const banner = document.getElementById('directoryModeBanner');
  if (!grid) return;

  const q = state.proQuery.trim().toLowerCase();
  const filtered = state.professionals.filter((p) => {
    const matchCat = state.proCategoryFilter === 'all' || (p.categories || []).includes(state.proCategoryFilter);
    const haystack = [
      p.businessName,
      p.displayName,
      p.headline,
      p.bio,
      p.location?.city,
      p.location?.locality,
      ...(p.productsUsed || []),
      ...(p.services || []).map((s) => s.name)
    ]
      .join(' ')
      .toLowerCase();
    return matchCat && (!q || haystack.includes(q));
  });

  if (banner) {
    const usingSample = state.professionals.some((p) => p.isSampleData);
    banner.hidden = !usingSample;
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-box">No studios matched your current filter. Try clearing the search or choosing another category.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((pro) => {
      const shopTitle = pro.businessName || pro.displayName || 'Independent Studio';
      const prices = (pro.services || []).map((s) => Number(s.priceMin) || 0).filter((n) => n > 0);
      const minPrice = prices.length ? formatINR(Math.min(...prices)) : 'Quote on request';
      const products = (pro.productsUsed || []).slice(0, 3);
      return `
      <article class="pro-card">
        <div class="pro-card-top">
          <div>
            <div class="pro-badges">
              ${pro.isVerified ? '<span class="badge badge-mint">Verified Studio</span>' : '<span class="badge badge-lavender">Independent Pro</span>'}
              ${pro.isSampleData ? '<span class="badge badge-peach">Sample Showcase</span>' : ''}
            </div>
            <h3>${escapeHtml(shopTitle)}</h3>
            <p class="pro-owner">${escapeHtml(pro.displayName || '')} &middot; ${escapeHtml(pro.location?.city || 'India')}</p>
          </div>
          <div class="pro-rating">★ ${Number(pro.ratingAverage || 4.8).toFixed(1)}</div>
        </div>
        <p class="pro-headline">${escapeHtml(pro.headline || '')}</p>
        <p class="pro-bio">${escapeHtml((pro.bio || '').slice(0, 120))}${(pro.bio || '').length > 120 ? '...' : ''}</p>
        ${
          products.length
            ? `<div class="pro-products"><strong>Products used:</strong> ${products.map((x) => `<span>${escapeHtml(x)}</span>`).join('')}</div>`
            : ''
        }
        <div class="pro-card-foot">
          <div>
            <span class="price-label">Starting from</span>
            <strong class="price-val">${minPrice}</strong>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-view-pro="${escapeHtml(pro.uid)}">View Shop &amp; Book</button>
        </div>
      </article>`;
    })
    .join('');
}

function openProDetailModal(uid) {
  const pro = state.professionals.find((p) => p.uid === uid);
  if (!pro) return;
  state.selectedProModal = pro;
  const shopName = pro.businessName || pro.displayName || 'Studio';
  const body = document.getElementById('proModalBody');
  const services = pro.services || [];
  const products = pro.productsUsed || [];

  body.innerHTML = `
    <div class="pro-modal-head">
      <div>
        <div class="pro-badges">
          ${pro.isVerified ? '<span class="badge badge-mint">Verified Studio</span>' : '<span class="badge badge-lavender">Registered Studio</span>'}
          ${pro.isSampleData ? '<span class="badge badge-peach">Sample Showcase</span>' : ''}
        </div>
        <h2>${escapeHtml(shopName)}</h2>
        <p class="muted">${escapeHtml(pro.displayName || '')} &middot; ${escapeHtml(pro.location?.locality || '')} ${escapeHtml(pro.location?.city || '')} &middot; ${pro.experienceYears || 0} yrs experience</p>
      </div>
    </div>

    <div class="pro-modal-section">
      <h4>About This Shop</h4>
      <p>${escapeHtml(pro.bio || pro.headline || 'No description added yet.')}</p>
    </div>

    <div class="pro-modal-section">
      <h4>Products &amp; Brands Used</h4>
      ${
        products.length
          ? `<div class="chip-row">${products.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`
          : '<p class="muted">No products listed yet.</p>'
      }
      ${pro.productsSummary ? `<p class="muted" style="margin-top:8px;">${escapeHtml(pro.productsSummary)}</p>` : ''}
    </div>

    <div class="pro-modal-section">
      <h4>Services &amp; Prices</h4>
      ${
        services.length
          ? `<div class="service-list">
              ${services
                .map(
                  (s) => `
                <div class="service-row">
                  <div>
                    <strong>${escapeHtml(s.name)}</strong>
                    <p class="muted">${escapeHtml(s.description || '')} &middot; Approx. ${Number(s.durationMinutes || 60)} mins</p>
                  </div>
                  <div class="service-row-right">
                    <span class="service-price">${formatINR(s.priceMin)}</span>
                    <button type="button" class="btn btn-primary btn-sm" data-book-service="${escapeHtml(s.id)}">Book</button>
                  </div>
                </div>`
                )
                .join('')}
            </div>`
          : '<p class="muted">No services published yet.</p>'
      }
    </div>
  `;
  openModal('proDetailModal');
}

// ---------------------------------------------------------------------------
// 6. BOOKING FLOW (AUTH MANDATORY ONLY WHEN BOOKING!)
// ---------------------------------------------------------------------------
function startBookingFlow(pro, service) {
  if (!state.user) {
    state.pendingBooking = { pro, service };
    closeModal('proDetailModal');
    showToast('Please sign in or create a free Customer account to confirm your booking.', 'info');
    openAuthModal('signin', 'customer');
    return;
  }
  closeModal('proDetailModal');
  openBookingModal(pro, service);
}

function openBookingModal(pro, service) {
  state.pendingBooking = { pro, service };
  document.getElementById('bookShopName').textContent = pro.businessName || pro.displayName;
  document.getElementById('bookServiceName').textContent = service.name;
  document.getElementById('bookServicePrice').textContent = formatINR(service.priceMin);
  document.getElementById('bookingErrorMsg').hidden = true;
  openModal('bookingModal');
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  if (!state.firebaseReady || !state.user || !state.pendingBooking) {
    showToast('Please connect Firebase and sign in to complete your booking.', 'error');
    return;
  }
  const { pro, service } = state.pendingBooking;
  const errEl = document.getElementById('bookingErrorMsg');
  errEl.hidden = true;

  if (pro.isSampleData) {
    errEl.textContent = 'This is a sample showcase studio. Register a real studio in the Professional Dashboard to test live bookings.';
    errEl.hidden = false;
    return;
  }

  try {
    const now = new Date().toISOString();
    await addDoc(collection(state.db, 'serviceBookings'), {
      customerId: state.user.uid,
      customerName: state.userRecord?.displayName || state.user.displayName || state.user.email,
      customerEmail: state.user.email,
      professionalId: pro.uid,
      shopName: pro.businessName || pro.displayName,
      serviceId: service.id,
      serviceName: service.name,
      price: Number(service.priceMin) || 0,
      preferredDate: document.getElementById('bookDateInput').value,
      preferredTime: document.getElementById('bookTimeInput').value,
      address: document.getElementById('bookAddressInput').value.trim(),
      notes: document.getElementById('bookNotesInput').value.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    });
    state.pendingBooking = null;
    closeModal('bookingModal');
    showToast('Booking request sent! Track its status under My Bookings.', 'success');
    switchView('bookings');
  } catch (err) {
    errEl.textContent = err?.message || 'Could not submit booking.';
    errEl.hidden = false;
  }
}

async function loadCustomerBookings() {
  const listEl = document.getElementById('customerBookingsList');
  if (!listEl) return;
  if (!state.user || !state.firebaseReady) {
    listEl.innerHTML = `<div class="empty-box">Sign in as a Customer to view and manage your bookings.</div>`;
    return;
  }
  listEl.innerHTML = `<div class="empty-box">Loading your bookings...</div>`;
  try {
    const q = query(
      collection(state.db, 'serviceBookings'),
      where('customerId', '==', state.user.uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    state.myBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!state.myBookings.length) {
      listEl.innerHTML = `<div class="empty-box">You have not booked any services yet. Browse professionals to book your first service!</div>`;
      return;
    }
    listEl.innerHTML = state.myBookings
      .map(
        (b) => `
      <div class="dash-row">
        <div>
          <strong>${escapeHtml(b.serviceName)}</strong> &middot; <span class="muted">${escapeHtml(b.shopName)}</span>
          <p class="muted">${escapeHtml(b.preferredDate)} (${escapeHtml(b.preferredTime)}) &middot; ${formatINR(b.price)}</p>
        </div>
        <div class="dash-row-actions">
          <span class="badge">${escapeHtml(b.status)}</span>
          ${['pending', 'confirmed'].includes(b.status) ? `<button type="button" class="btn btn-ghost btn-sm" data-cancel-booking="${escapeHtml(b.id)}">Cancel</button>` : ''}
        </div>
      </div>`
      )
      .join('');
  } catch (err) {
    listEl.innerHTML = `<div class="empty-box">Could not load bookings: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// 7. PROFESSIONAL DASHBOARD (SHOP NAME, SERVICES & PRICES, PRODUCTS USED)
// ---------------------------------------------------------------------------
async function loadProDashboard() {
  const gate = document.getElementById('proAuthGate');
  const content = document.getElementById('proDashContent');
  if (!state.user || !state.firebaseReady) {
    gate.hidden = false;
    content.hidden = true;
    return;
  }
  gate.hidden = true;
  content.hidden = false;

  try {
    const snap = await getDoc(doc(state.db, 'professionalProfiles', state.user.uid));
    if (snap.exists()) {
      const p = snap.data();
      state.proProfile = p;
      state.proServices = Array.isArray(p.services) ? [...p.services] : [];
      document.getElementById('proShopName').value = p.businessName || '';
      document.getElementById('proDisplayName').value = p.displayName || '';
      document.getElementById('proHeadline').value = p.headline || '';
      document.getElementById('proBio').value = p.bio || '';
      document.getElementById('proCategory').value = (p.categories && p.categories[0]) || 'makeup';
      document.getElementById('proCity').value = p.location?.city || '';
      document.getElementById('proLocality').value = p.location?.locality || '';
      document.getElementById('proExp').value = p.experienceYears || 0;
      document.getElementById('proProductsUsed').value = (p.productsUsed || []).join(', ');
      document.getElementById('proProductsSummary').value = p.productsSummary || '';
      document.getElementById('proStatus').value = p.profileStatus || 'active';
    } else {
      state.proServices = [];
    }
    renderProServicesList();
    await loadProBookings();
  } catch (err) {
    showToast('Error loading professional dashboard: ' + err.message, 'error');
  }
}

function renderProServicesList() {
  const list = document.getElementById('proServicesList');
  if (!list) return;
  if (!state.proServices.length) {
    list.innerHTML = `<p class="muted">No services added yet. Add your services and prices below.</p>`;
    return;
  }
  list.innerHTML = state.proServices
    .map(
      (s, idx) => `
    <div class="dash-row">
      <div>
        <strong>${escapeHtml(s.name)}</strong> &middot; <span class="service-price">${formatINR(s.priceMin)}</span>
        <p class="muted">${escapeHtml(s.description || '')} (${Number(s.durationMinutes || 60)} mins)</p>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" data-remove-pro-service="${idx}">Remove</button>
    </div>`
    )
    .join('');
}

async function handleSaveProProfile(e) {
  e.preventDefault();
  if (!state.user || !state.db) return;
  const now = new Date().toISOString();
  const existing = state.proProfile || {};
  const payload = {
    uid: state.user.uid,
    businessName: document.getElementById('proShopName').value.trim(),
    displayName: document.getElementById('proDisplayName').value.trim(),
    headline: document.getElementById('proHeadline').value.trim(),
    bio: document.getElementById('proBio').value.trim(),
    categories: [document.getElementById('proCategory').value],
    location: {
      city: document.getElementById('proCity').value.trim(),
      locality: document.getElementById('proLocality').value.trim(),
      country: 'India'
    },
    serviceModes: ['at_home', 'at_studio'],
    serviceRadiusKm: 20,
    experienceYears: Number(document.getElementById('proExp').value) || 0,
    productsUsed: document
      .getElementById('proProductsUsed')
      .value.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    productsSummary: document.getElementById('proProductsSummary').value.trim(),
    services: state.proServices,
    profileStatus: document.getElementById('proStatus').value,
    isVerified: existing.isVerified ?? false,
    verificationStatus: existing.verificationStatus ?? 'not_submitted',
    isFeatured: existing.isFeatured ?? false,
    ratingAverage: existing.ratingAverage ?? 0,
    reviewCount: existing.reviewCount ?? 0,
    completedBookingsCount: existing.completedBookingsCount ?? 0,
    createdAt: existing.createdAt || now,
    updatedAt: now
  };

  try {
    await setDoc(doc(state.db, 'professionalProfiles', state.user.uid), payload, { merge: true });
    state.proProfile = payload;
    showToast('Shop profile, services & products saved!', 'success');
    await loadPublicProfessionals();
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}

async function loadProBookings() {
  const list = document.getElementById('proBookingsList');
  if (!list || !state.user || !state.db) return;
  try {
    const q = query(
      collection(state.db, 'serviceBookings'),
      where('professionalId', '==', state.user.uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    state.proBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!state.proBookings.length) {
      list.innerHTML = `<p class="muted">No incoming bookings yet.</p>`;
      return;
    }
    list.innerHTML = state.proBookings
      .map(
        (b) => `
      <div class="dash-row">
        <div>
          <strong>${escapeHtml(b.serviceName)}</strong> &middot; ${formatINR(b.price)}
          <p class="muted">Customer: ${escapeHtml(b.customerName)} &middot; ${escapeHtml(b.preferredDate)} (${escapeHtml(b.preferredTime)})</p>
          <p class="muted">Address: ${escapeHtml(b.address)} ${b.notes ? '&middot; ' + escapeHtml(b.notes) : ''}</p>
        </div>
        <div class="dash-row-actions">
          <span class="badge">${escapeHtml(b.status)}</span>
          ${
            b.status === 'pending'
              ? `<button type="button" class="btn btn-primary btn-sm" data-pro-book-action="${escapeHtml(b.id)}:confirmed">Confirm</button>
                 <button type="button" class="btn btn-ghost btn-sm" data-pro-book-action="${escapeHtml(b.id)}:declined">Decline</button>`
              : b.status === 'confirmed'
              ? `<button type="button" class="btn btn-soft btn-sm" data-pro-book-action="${escapeHtml(b.id)}:completed">Mark Completed</button>`
              : ''
          }
        </div>
      </div>`
      )
      .join('');
  } catch (err) {
    list.innerHTML = `<p class="muted">Could not load bookings: ${escapeHtml(err.message)}</p>`;
  }
}

// ---------------------------------------------------------------------------
// 8. ADMIN DASHBOARD
// ---------------------------------------------------------------------------
async function loadAdminDashboard() {
  const gate = document.getElementById('adminAuthGate');
  const content = document.getElementById('adminDashContent');
  if (!state.firebaseReady || !state.user || !state.isAdmin) {
    gate.hidden = false;
    content.hidden = true;
    return;
  }
  gate.hidden = true;
  content.hidden = false;

  try {
    const [usersSnap, prosSnap, bookingsSnap] = await Promise.all([
      getDocs(query(collection(state.db, 'users'), limit(100))),
      getDocs(query(collection(state.db, 'professionalProfiles'), limit(100))),
      getDocs(query(collection(state.db, 'serviceBookings'), limit(100)))
    ]);
    state.adminUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.adminPros = prosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.adminBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    document.getElementById('kpiUsers').textContent = state.adminUsers.length;
    document.getElementById('kpiPros').textContent = state.adminPros.length;
    document.getElementById('kpiVerified').textContent = state.adminPros.filter((p) => p.isVerified).length;
    document.getElementById('kpiBookings').textContent = state.adminBookings.length;

    renderAdminTables();
  } catch (err) {
    showToast('Admin load error: ' + err.message, 'error');
  }
}

function renderAdminTables() {
  const prosEl = document.getElementById('adminProsList');
  const bookEl = document.getElementById('adminBookingsList');

  if (prosEl) {
    prosEl.innerHTML = state.adminPros.length
      ? state.adminPros
          .map(
            (p) => `
        <div class="dash-row">
          <div>
            <strong>${escapeHtml(p.businessName || p.displayName || p.uid)}</strong>
            <p class="muted">${escapeHtml(p.location?.city || 'City unset')} &middot; ${(p.services || []).length} services &middot; Products: ${escapeHtml((p.productsUsed || []).join(', ') || 'None')}</p>
          </div>
          <div class="dash-row-actions">
            <span class="badge">${p.isVerified ? 'Verified' : 'Unverified'}</span>
            <span class="badge">${escapeHtml(p.profileStatus || 'active')}</span>
            <button type="button" class="btn btn-soft btn-sm" data-admin-verify="${escapeHtml(p.uid)}:${!p.isVerified}">${p.isVerified ? 'Unverify' : 'Verify'}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-admin-status="${escapeHtml(p.uid)}:${p.profileStatus === 'suspended' ? 'active' : 'suspended'}">${p.profileStatus === 'suspended' ? 'Activate' : 'Suspend'}</button>
          </div>
        </div>`
          )
          .join('')
      : '<p class="muted">No professionals registered yet.</p>';
  }

  if (bookEl) {
    bookEl.innerHTML = state.adminBookings.length
      ? state.adminBookings
          .map(
            (b) => `
        <div class="dash-row">
          <div>
            <strong>${escapeHtml(b.serviceName)}</strong> &middot; ${escapeHtml(b.shopName)}
            <p class="muted">Customer: ${escapeHtml(b.customerName)} &middot; ${escapeHtml(b.preferredDate)} &middot; ${formatINR(b.price)}</p>
          </div>
          <span class="badge">${escapeHtml(b.status)}</span>
        </div>`
          )
          .join('')
      : '<p class="muted">No bookings recorded yet.</p>';
  }
}

// ---------------------------------------------------------------------------
// 9. EVENT DELEGATION & BOOTSTRAP
// ---------------------------------------------------------------------------
document.addEventListener('click', async (e) => {
  const target = e.target;

  const navDrawer = document.getElementById('navDrawer');
  const navToggle = document.getElementById('navToggle');
  if (target.closest('#navToggle')) {
    const open = navDrawer.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    return;
  }

  const openAuthBtn = target.closest('[data-open-auth]');
  if (openAuthBtn) {
    const kind = openAuthBtn.dataset.openAuth;
    if (kind === 'register-pro') openAuthModal('register', 'professional');
    else if (kind === 'register-customer') openAuthModal('register', 'customer');
    else openAuthModal('signin', 'customer');
    return;
  }

  const navViewBtn = target.closest('[data-nav-view]');
  if (navViewBtn) {
    navDrawer?.classList.remove('open');
    switchView(navViewBtn.dataset.navView);
    return;
  }

  if (target.closest('#logoutBtn')) {
    if (state.auth) await signOut(state.auth);
    showToast('Signed out.', 'info');
    switchView('home');
    return;
  }

  const closeBtn = target.closest('[data-close-modal]');
  if (closeBtn) {
    closeModal(closeBtn.dataset.closeModal);
    return;
  }

  const groupBtn = target.closest('[data-cat-group]');
  if (groupBtn) {
    document.querySelectorAll('[data-cat-group]').forEach((b) => b.classList.remove('active'));
    groupBtn.classList.add('active');
    state.catGroupFilter = groupBtn.dataset.catGroup;
    renderCategories();
    return;
  }

  const catCard = target.closest('[data-select-category]');
  if (catCard) {
    state.proCategoryFilter = catCard.dataset.selectCategory;
    const sel = document.getElementById('proFilterCategory');
    if (sel) sel.value = state.proCategoryFilter;
    renderProfessionalsDirectory();
    document.getElementById('professionalsSection')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const viewProBtn = target.closest('[data-view-pro]');
  if (viewProBtn) {
    openProDetailModal(viewProBtn.dataset.viewPro);
    return;
  }

  const bookSrvBtn = target.closest('[data-book-service]');
  if (bookSrvBtn && state.selectedProModal) {
    const srv = (state.selectedProModal.services || []).find((s) => s.id === bookSrvBtn.dataset.bookService);
    if (srv) startBookingFlow(state.selectedProModal, srv);
    return;
  }

  const cancelBookBtn = target.closest('[data-cancel-booking]');
  if (cancelBookBtn && state.db) {
    await updateDoc(doc(state.db, 'serviceBookings', cancelBookBtn.dataset.cancelBooking), {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    showToast('Booking cancelled.', 'info');
    await loadCustomerBookings();
    return;
  }

  const removeSrvBtn = target.closest('[data-remove-pro-service]');
  if (removeSrvBtn) {
    state.proServices.splice(Number(removeSrvBtn.dataset.removeProService), 1);
    renderProServicesList();
    return;
  }

  const proActionBtn = target.closest('[data-pro-book-action]');
  if (proActionBtn && state.db) {
    const [id, status] = proActionBtn.dataset.proBookAction.split(':');
    await updateDoc(doc(state.db, 'serviceBookings', id), {
      status,
      updatedAt: new Date().toISOString()
    });
    showToast(`Booking marked ${status}.`, 'success');
    await loadProBookings();
    return;
  }

  const adminVerifyBtn = target.closest('[data-admin-verify]');
  if (adminVerifyBtn && state.db) {
    const [uid, val] = adminVerifyBtn.dataset.adminVerify.split(':');
    const isVerified = val === 'true';
    await updateDoc(doc(state.db, 'professionalProfiles', uid), {
      isVerified,
      verificationStatus: isVerified ? 'approved' : 'not_submitted',
      updatedAt: new Date().toISOString()
    });
    showToast(isVerified ? 'Studio verified.' : 'Verification removed.', 'success');
    await loadAdminDashboard();
    await loadPublicProfessionals();
    return;
  }

  const adminStatusBtn = target.closest('[data-admin-status]');
  if (adminStatusBtn && state.db) {
    const [uid, profileStatus] = adminStatusBtn.dataset.adminStatus.split(':');
    await updateDoc(doc(state.db, 'professionalProfiles', uid), {
      profileStatus,
      updatedAt: new Date().toISOString()
    });
    showToast(`Studio status updated to ${profileStatus}.`, 'success');
    await loadAdminDashboard();
    await loadPublicProfessionals();
    return;
  }

  const faqBtn = target.closest('.faq-q');
  if (faqBtn) {
    const item = faqBtn.closest('.faq-item');
    const open = item.classList.toggle('open');
    faqBtn.setAttribute('aria-expanded', String(open));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderNavAuth();

  document.getElementById('catSearchInput')?.addEventListener('input', (e) => {
    state.catQuery = e.target.value;
    renderCategories();
  });

  document.getElementById('heroSearchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('heroSearchInput').value;
    state.proQuery = val;
    document.getElementById('proSearchInput').value = val;
    renderProfessionalsDirectory();
    document.getElementById('professionalsSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('proSearchInput')?.addEventListener('input', (e) => {
    state.proQuery = e.target.value;
    renderProfessionalsDirectory();
  });

  document.getElementById('proFilterCategory')?.addEventListener('change', (e) => {
    state.proCategoryFilter = e.target.value;
    renderProfessionalsDirectory();
  });

  document.getElementById('authModeSelect')?.addEventListener('change', syncAuthFormFields);
  document.getElementById('authRoleSelect')?.addEventListener('change', syncAuthFormFields);
  document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
  document.getElementById('bookingForm')?.addEventListener('submit', handleBookingSubmit);
  document.getElementById('proProfileForm')?.addEventListener('submit', handleSaveProProfile);

  document.getElementById('addProServiceForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newSrvName').value.trim();
    const priceMin = Number(document.getElementById('newSrvPrice').value) || 0;
    const durationMinutes = Number(document.getElementById('newSrvDuration').value) || 60;
    const description = document.getElementById('newSrvDesc').value.trim();
    if (!name) return;
    state.proServices.push({
      id: 'srv_' + Date.now(),
      name,
      priceMin,
      priceMax: priceMin,
      currency: 'INR',
      durationMinutes,
      description
    });
    e.target.reset();
    renderProServicesList();
    showToast('Service added to list. Click "Save Shop Profile" to publish.', 'info');
  });

  document.getElementById('firebaseConnectForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const raw = document.getElementById('firebaseConfigJson').value.trim();
      const parsed = JSON.parse(raw);
      if (!parsed.apiKey || !parsed.projectId) throw new Error('Missing apiKey or projectId.');
      localStorage.setItem('veyra_firebase_config', JSON.stringify(parsed));
      initFirebase();
      showToast('Firebase connected! You can now sign in with your Admin account.', 'success');
    } catch (err) {
      showToast('Invalid Firebase JSON: ' + err.message, 'error');
    }
  });

  initFirebase();
  loadPublicProfessionals();
});
