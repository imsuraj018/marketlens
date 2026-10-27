import {
  useEffect,
  useState,
  createContext,
  useContext,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import { Heart, LogOut } from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import type { User } from "@supabase/supabase-js";

import {
  db,
  type Profile,
  type Business,
  type Role,
  money,
  track,
} from "./lib";

import WorkspaceLayout from "./components/WorkspaceLayout";
import type { NavigationItem } from "./components/Sidebar";



import StorefrontPage from "./features/autocommerce/pages/StorefrontPage";
import OwnerProductsPage from "./features/autocommerce/pages/OwnerProductsPage";


/* ==========================================
   AUTH CONTEXT
========================================== */

type Auth = {
  user: User | null;
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<Auth>({
  user: null,
  profile: null,
  refresh: async () => {},
  loading: true,
});

const useAuth = () => useContext(AuthContext);

function useNotice() {
  const [message, setMessage] = useState("");
  return { message, setMessage };
}

function Notice({ message }: { message: string }) {
  return message ? (
    <p role="status" className="notice">
      {message}
    </p>
  ) : null;
}

function Panel({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panelhead">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="stat">
      <small>{title}</small>
      <strong>{value}</strong>
    </div>
  );
}

/* ==========================================
   ROLE NAVIGATION
========================================== */

const roleNavigation: Record<Role, NavigationItem[]> = {
  customer: [
    { id: "/dashboard", label: "Dashboard", icon: "▦" },
    { id: "/stores", label: "Explore Shops", icon: "⌕" },
    { id: "/insights", label: "Market Insights", icon: "▥" },
    { id: "/opportunities", label: "Opportunities", icon: "✧" },
  ],

  business_owner: [
    { id: "/dashboard", label: "Dashboard", icon: "▦" },
    { id: "/owner", label: "Owner Studio", icon: "▣" },
    { id: "/owner/products", label: "AutoCommerce", icon: "▣" },
    { id: "/stores", label: "Explore Shops", icon: "⌕" },
    { id: "/insights", label: "Revenue Estimator", icon: "▥" },
  ],

  analyst: [
    { id: "/dashboard", label: "Dashboard", icon: "▦" },
    { id: "/analyst", label: "Research Workspace", icon: "▥" },
    { id: "/insights", label: "Market Insights", icon: "◇" },
    { id: "/opportunities", label: "Opportunities", icon: "✧" },
  ],

  admin: [
    { id: "/dashboard", label: "Dashboard", icon: "▦" },
    { id: "/admin", label: "Admin Console", icon: "⚙" },
    { id: "/analyst", label: "Market Analytics", icon: "▥" },
    { id: "/stores", label: "Public Directory", icon: "⌕" },
  ],
};

/* ==========================================
   PRIVATE LAYOUT
========================================== */

function PrivateShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!auth.profile) return <>{children}</>;

  return (
    <WorkspaceLayout
      role={auth.profile.role}
      userName={auth.profile.full_name || "My Account"}
      activePage={location.pathname}
      pageTitle={title}
      pageDescription={description}
      items={roleNavigation[auth.profile.role]}
      onNavigate={(path) => navigate(path)}
      onSignOut={async () => {
        await db.auth.signOut();
        navigate("/");
      }}
    >
      {children}
    </WorkspaceLayout>
  );
}

/* ==========================================
   MAIN APPLICATION
========================================== */

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState("MarketLens");

  const location = useLocation();

  const privatePage = [
    "/dashboard",
    "/owner",
    "/owner/products",
    "/admin",
    "/analyst",
  ].includes(location.pathname);

  async function refresh() {
    const {
      data: { user: currentUser },
    } = await db.auth.getUser();

    setUser(currentUser);

    if (currentUser) {
      const { data } = await db
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      setProfile(data as Profile | null);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(() => {
      setTimeout(() => refresh(), 0);
    });

    
    db.from("app_settings")
      .select("value")
      .eq("key", "site_name")
      .single()
      .then(({ data }) => {
        if (typeof data?.value === "string") {
          setBrand(data.value);
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.removeProperty("--accent");
}, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, refresh, loading }}
    >
      {!privatePage && (
        <header className="header db-header">
          <Link className="brand db-brand" to="/">
            ◈ {brand}
          </Link>

          <nav>
            <NavLink to="/stores">Directory</NavLink>
            <NavLink to="/insights">Insights</NavLink>
            <NavLink to="/opportunities">Opportunities</NavLink>

            {user && (
              <NavLink to="/dashboard">Dashboard</NavLink>
            )}

            {!user ? (
              <NavLink className="pillbutton db-pillbutton" to="/auth">
                Get Started
              </NavLink>
            ) : (
              <button
                className="linklike"
                onClick={async () => {
                  await db.auth.signOut();
                  window.location.href = "/";
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            )}
          </nav>
        </header>
      )}

      <main
        className={
          privatePage ? "ml-route-main" : "ml-public-main"
        }
      >
        <Routes>
          <Route
            path="/"
            element={<Home brand={brand} />}
          />

          <Route path="/auth" element={<AuthPage />} />

          <Route path="/store" element={<StorefrontPage />} />

          <Route
            path="/owner/products"
            element={
              <Require roles={["business_owner", "admin"]}>
                <PrivateShell
                  title="AutoCommerce"
                  description="Manage products, catalogue and customer enquiries."
                >
                  <OwnerProductsPage />
                </PrivateShell>
              </Require>
            }
          />

          <Route
            path="/stores"
            element={<Directory />}
          />

          <Route
            path="/stores/:id"
            element={<BusinessDetail />}
          />

          <Route
            path="/insights"
            element={<Insights />}
          />

          <Route
            path="/opportunities"
            element={<Opportunities />}
          />

          <Route
            path="/dashboard"
            element={
              <Require>
                <PrivateShell
                  title="Dashboard"
                  description="Your MarketLens account overview."
                >
                  <Dashboard />
                </PrivateShell>
              </Require>
            }
          />

          <Route
            path="/owner"
            element={
              <Require roles={["business_owner"]}>
                <PrivateShell
                  title="Owner Studio"
                  description="Manage listings, enquiries and revenue."
                >
                  <Owner />
                </PrivateShell>
              </Require>
            }
          />

          <Route
            path="/admin"
            element={
              <Require roles={["admin"]}>
                <PrivateShell
                  title="Admin Console"
                  description="Manage users, approvals and platform activity."
                >
                  <Admin />
                </PrivateShell>
              </Require>
            }
          />

          <Route
            path="/analyst"
            element={
              <Require roles={["analyst", "admin"]}>
                <PrivateShell
                  title="Research Workspace"
                  description="Explore market intelligence and models."
                >
                  <Analyst />
                </PrivateShell>
              </Require>
            }
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      {!privatePage && (
        <footer className="db-footer">
          <div className="db-footer-inner">
            <div className="db-footer-brand">
              <span className="db-footer-logo">◈ {brand || 'MarketLens'}</span>
              <p>The intelligence platform for local commerce in Sant Tukaram Nagar, Pimpri.</p>
            </div>
            <div className="db-footer-links">
              <div>
                <strong>Platform</strong>
                <Link to="/stores">Directory</Link>
                <Link to="/insights">Market Insights</Link>
                <Link to="/opportunities">Opportunities</Link>
              </div>
              <div>
                <strong>Business</strong>
                <Link to="/auth">Get Started</Link>
                <Link to="/dashboard">Owner Studio</Link>
                <Link to="/insights">Methodology</Link>
              </div>
              <div>
                <strong>Legal</strong>
                <span>Financial estimates are models, not verified earnings.</span>
              </div>
            </div>
          </div>
          <div className="db-footer-bottom">
            <span>© 2024 MarketLens · Sant Tukaram Nagar, Pimpri</span>
          </div>
        </footer>
      )}
    </AuthContext.Provider>
  );
}

/* ==========================================
   ROUTE PROTECTION
========================================== */

function Require({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const auth = useAuth();

  if (auth.loading) {
    return <p>Loading account…</p>;
  }

  if (!auth.user) {
    return <Navigate to="/auth" replace />;
  }

  if (!auth.profile?.is_active) {
    return (
      <Panel title="Account unavailable">
        Contact the administrator.
      </Panel>
    );
  }

  if (
    roles &&
    !roles.includes(auth.profile.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/* ==========================================
   HOMEPAGE
========================================== */

function Home({ brand }: { brand: string }) {
  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            SANT TUKARAM NAGAR · PIMPRI
          </span>

          <h1>
            The Intelligence Platform for{" "}
            <span className="hero-gradient-text">
              Local Commerce
            </span>
          </h1>

          <p className="hero-sub">
            Discover verified local businesses, connect with owners,
            and unlock transparent market intelligence for your neighbourhood.
          </p>

          <div className="actions">
            <Link className="button primary db-btn-primary" to="/stores">
              Explore Businesses
            </Link>
            <Link className="button db-btn-ghost" to="/auth">
              Get Started Free →
            </Link>
          </div>

          <p className="hero-trust">
            ✓ Admin-verified listings &nbsp;·&nbsp; ✓ Real market data &nbsp;·&nbsp; ✓ Free to browse
          </p>
        </div>

        <div className="heroart db-heroart">
          <div className="db-stat-card">
            <span className="db-stat-num">500+</span>
            <span className="db-stat-label">Listed Businesses</span>
          </div>
          <div className="db-stat-card">
            <span className="db-stat-num">10K+</span>
            <span className="db-stat-label">Monthly Visitors</span>
          </div>
          <div className="db-stat-card">
            <span className="db-stat-num">98%</span>
            <span className="db-stat-label">Verified Listings</span>
          </div>
          <div className="db-stat-card">
            <span className="db-stat-num">4</span>
            <span className="db-stat-label">Business Categories</span>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="db-trust-strip">
        <p className="db-trust-label">TRUSTED BY BUSINESSES IN</p>
        <div className="db-trust-logos">
          <span>🛒 Daily Essentials</span>
          <span>✚ Health &amp; Wellness</span>
          <span>☕ Food &amp; Cafés</span>
          <span>▤ Student Services</span>
          <span>🏠 Home Services</span>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="db-features-section">
        <div className="db-section-head">
          <span className="eyebrow">PLATFORM CAPABILITIES</span>
          <h2>Everything you need to understand local commerce</h2>
          <p>From business discovery to market intelligence — all in one place.</p>
        </div>

        <div className="db-features-grid">
          <div className="db-feature-card db-feature-card--large">
            <div className="db-feature-icon">🔍</div>
            <h3>Verified Business Directory</h3>
            <p>Browse admin-approved local businesses with verified contact details, categories, and locations. No spam, no unverified listings.</p>
            <Link to="/stores" className="db-link-arrow">Browse directory →</Link>
          </div>

          <div className="db-feature-card">
            <div className="db-feature-icon">📊</div>
            <h3>Market Intelligence</h3>
            <p>Estimate potential revenue and market opportunity with transparent, adjustable financial models.</p>
            <Link to="/insights" className="db-link-arrow">Open insights →</Link>
          </div>

          <div className="db-feature-card">
            <div className="db-feature-icon">🏪</div>
            <h3>Owner Studio</h3>
            <p>Apply for business owner access, create listings, manage enquiries, and track your shop's performance.</p>
            <Link to="/dashboard" className="db-link-arrow">Get started →</Link>
          </div>

          <div className="db-feature-card">
            <div className="db-feature-icon">✉️</div>
            <h3>Direct Enquiries</h3>
            <p>Contact businesses directly through the platform. Business owners can manage and respond to all customer messages.</p>
            <Link to="/stores" className="db-link-arrow">Find businesses →</Link>
          </div>

          <div className="db-feature-card db-feature-card--accent">
            <div className="db-feature-icon">🚀</div>
            <h3>Opportunity Finder</h3>
            <p>Identify market gaps and business opportunities in your neighbourhood with data-driven insights.</p>
            <Link to="/opportunities" className="db-link-arrow">View opportunities →</Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="db-how-section">
        <div className="db-section-head">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Three steps to neighbourhood intelligence</h2>
        </div>

        <div className="db-steps">
          <div className="db-step">
            <div className="db-step-num">01</div>
            <h3>Discover</h3>
            <p>Search and filter verified local businesses by category, location, and service type.</p>
          </div>
          <div className="db-step-divider" />
          <div className="db-step">
            <div className="db-step-num">02</div>
            <h3>Connect</h3>
            <p>Send direct enquiries to business owners. Get responses and build relationships.</p>
          </div>
          <div className="db-step-divider" />
          <div className="db-step">
            <div className="db-step-num">03</div>
            <h3>Analyse</h3>
            <p>Use market data and revenue models to make informed business decisions.</p>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="db-cta-banner">
        <div className="db-cta-content">
          <h2>Ready to explore your neighbourhood?</h2>
          <p>Join hundreds of businesses and thousands of customers already using MarketLens.</p>
          <div className="actions">
            <Link className="button db-cta-btn" to="/stores">
              Explore Businesses
            </Link>
            <Link className="button db-btn-ghost-dark" to="/auth">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ==========================================
   AUTHENTICATION PAGE
========================================== */

function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { message, setMessage } = useNotice();

  const [mode, setMode] = useState<
    "login" | "register"
  >("login");

  const [busy, setBusy] = useState(false);

  if (auth.user) {
    return <Navigate to="/dashboard" />;
  }

  async function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setBusy(true);

    const result =
      mode === "login"
        ? await db.auth.signInWithPassword({
            email,
            password,
          })
        : await db.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: String(
                  form.get("name") || ""
                ),
              },
            },
          });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "register") {
      setMessage(
        "Account created. Check your email for verification if enabled."
      );
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="authbox">
      <Panel
        title={
          mode === "login"
            ? "Welcome back"
            : "Create an account"
        }
      >
        <div className="tabs">
          <button
            className={
              mode === "login" ? "active" : ""
            }
            onClick={() => setMode("login")}
          >
            Sign in
          </button>

          <button
            className={
              mode === "register" ? "active" : ""
            }
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </label>

          <button
            disabled={busy}
            className="button primary"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create customer account"}
          </button>
        </form>

        <Notice message={message} />

        <p className="hint">
          New accounts start as customers.
          Business-owner privileges require admin approval.
        </p>
      </Panel>
    </div>
  );
}

/* ==========================================
   BUSINESS DIRECTORY
========================================== */

function Directory() {
  const [rows, setRows] = useState<Business[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from("categories")
      .select("*")
      .then(({ data }) => {
        setCategories(data || []);
      });

    db.from("businesses")
      .select("*")
      .eq("status", "approved")
      .order("name")
      .then(({ data }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = rows.filter(
    (business) =>
      (!category ||
        business.category_id === category) &&
      [
        business.name,
        business.description,
        business.address,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          PUBLIC DIRECTORY
        </span>

        <h1>Explore local businesses</h1>

        <p>
          Approved listings only. New shops appear after
          admin review.
        </p>
      </div>

      <Panel
        title="Find a business"
        aside={
          <span className="badge">
            {filtered.length} results
          </span>
        }
      >
        <div className="filters">
          <input
            aria-label="Search businesses"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, service or address…"
          />

          <select
            aria-label="Category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            <option value="">All categories</option>

            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            className="button"
            onClick={() => {
              if (q.trim().length >= 2) {
                track("business_search", q.trim());
              }
            }}
          >
            Search
          </button>
        </div>
      </Panel>

      <div className="grid three cards">
        {loading ? (
          <p>Loading…</p>
        ) : filtered.length ? (
          filtered.map((business) => (
            <Link
              className="businesscard"
              to={"/stores/" + business.id}
              key={business.id}
            >
              <div className="shopicon">▣</div>

              <span className="badge">
                Verified listing
              </span>

              <h3>{business.name}</h3>

              <p>
                {business.description ||
                  "Local business"}
              </p>

              <small>
                {business.address ||
                  "Sant Tukaram Nagar"}
              </small>

              <strong>View business →</strong>
            </Link>
          ))
        ) : (
          <p>
            No approved businesses match your search.
          </p>
        )}
      </div>
    </>
  );
}

/* ==========================================
   BUSINESS DETAILS
========================================== */

function BusinessDetail() {
  const { id } = useParams();
  const auth = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const { message, setMessage } = useNotice();

  useEffect(() => {
    if (!id) return;

    db.from("businesses")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .single()
      .then(({ data }) => {
        setBusiness(data);
        setLoading(false);
      });

    if (auth.user) {
      db.from("saved_businesses")
        .select("business_id")
        .eq("user_id", auth.user.id)
        .eq("business_id", id)
        .maybeSingle()
        .then(({ data }) => {
          setSaved(!!data);
        });

      track("business_view", id);
    }
  }, [id, auth.user?.id]);

  async function toggleBookmark() {
    if (!auth.user || !business) {
      setMessage("Sign in to save businesses.");
      return;
    }

    const result = saved
      ? await db
          .from("saved_businesses")
          .delete()
          .eq("user_id", auth.user.id)
          .eq("business_id", business.id)
      : await db.from("saved_businesses").insert({
          user_id: auth.user.id,
          business_id: business.id,
        });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setSaved(!saved);

      if (!saved) {
        await db.rpc("record_bookmark", {
          p_business: business.id,
        });
      }
    }
  }

  async function enquire(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!auth.user || !business) return;

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    const { data, error } = await db
      .from("enquiries")
      .insert({
        user_id: auth.user.id,
        business_id: business.id,
        subject: String(form.get("subject")),
        message: String(form.get("message")),
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
    } else {
      await db.rpc("record_enquiry", {
        p_enquiry: data.id,
      });

      setMessage("Enquiry sent successfully.");
      formElement.reset();
    }
  }

  if (loading) return <p>Loading…</p>;

  if (!business) {
    return (
      <p>
        Business not found or not approved.
      </p>
    );
  }

  return (
    <>
      <Link to="/stores">← All stores</Link>

      <div className="pagehead">
        <span className="badge">
          Approved business
        </span>

        <h1>{business.name}</h1>
        <p>{business.description}</p>
      </div>

      <div className="grid two">
        <Panel title="Business information">
          <p>
            <b>Address:</b>{" "}
            {business.address || "Not provided"}
          </p>

          <p>
            <b>Phone:</b>{" "}
            {business.phone || "Not provided"}
          </p>

          <p>
            <b>Email:</b>{" "}
            {business.email || "Not provided"}
          </p>

          <button
            className="button"
            onClick={toggleBookmark}
          >
            <Heart size={16} />
            {saved
              ? "Remove bookmark"
              : "Save business"}
          </button>

          <Notice message={message} />
        </Panel>

        <Panel title="Send an enquiry">
          {auth.user ? (
            <form
              className="form"
              onSubmit={enquire}
            >
              <label>
                Subject
                <input
                  name="subject"
                  minLength={3}
                  maxLength={200}
                  required
                />
              </label>

              <label>
                Message
                <textarea
                  name="message"
                  minLength={5}
                  maxLength={4000}
                  required
                  rows={5}
                />
              </label>

              <button className="button primary">
                Send enquiry
              </button>
            </form>
          ) : (
            <p>
              <Link to="/auth">Sign in</Link> to
              contact this business.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ==========================================
   CUSTOMER DASHBOARD
========================================== */

function Dashboard() {
  const auth = useAuth();

  const [saved, setSaved] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const { message, setMessage } = useNotice();

  useEffect(() => {
    if (!auth.user) return;

    db.from("saved_businesses")
      .select("business_id,businesses(name,id)")
      .eq("user_id", auth.user.id)
      .then(({ data }) => setSaved(data || []));

    db.from("enquiries")
      .select(
        "id,subject,status,created_at,businesses(name)"
      )
      .eq("user_id", auth.user.id)
      .order("created_at", {
        ascending: false,
      })
      .then(({ data }) =>
        setEnquiries(data || [])
      );

    db.from("owner_requests")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", {
        ascending: false,
      })
      .then(({ data }) =>
        setRequests(data || [])
      );
  }, [auth.user?.id]);

  async function requestOwner(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!auth.user) return;

    const form = new FormData(e.currentTarget);

    const { error } = await db
      .from("owner_requests")
      .insert({
        user_id: auth.user.id,
        reason: String(form.get("reason")),
      });

    setMessage(
      error
        ? error.message
        : "Your owner access request is pending admin review."
    );

    if (!error) {
      await auth.refresh();
    }
  }

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          PRIVATE WORKSPACE
        </span>

        <h1>
          Hello,{" "}
          {auth.profile?.full_name || "there"}
        </h1>

        <p>
          Role:{" "}
          <span className="badge">
            {auth.profile?.role}
          </span>
        </p>
      </div>

      <div className="grid three">
        <Stat
          title="Saved shops"
          value={saved.length}
        />

        <Stat
          title="Enquiries"
          value={enquiries.length}
        />

        <Stat
          title="Owner requests"
          value={requests.length}
        />
      </div>

      <div className="actions space">
        {auth.profile?.role === "admin" && (
          <Link
            className="button primary"
            to="/admin"
          >
            Admin console →
          </Link>
        )}

        {auth.profile?.role ===
          "business_owner" && (
          <Link
            className="button primary"
            to="/owner"
          >
            Owner studio →
          </Link>
        )}

        {["analyst", "admin"].includes(
          auth.profile?.role || ""
        ) && (
          <Link
            className="button"
            to="/analyst"
          >
            Analyst workspace →
          </Link>
        )}
      </div>

      {auth.profile?.role === "customer" && (
        <Panel title="Become a business owner">
          <p>
            Request access to list your shop.
            Approval is required before you can
            create listings.
          </p>

          <form
            className="form"
            onSubmit={requestOwner}
          >
            <label>
              Tell us about your business
              <textarea
                name="reason"
                minLength={10}
                maxLength={2000}
                required
              />
            </label>

            <button
              className="button primary"
              disabled={requests.some(
                (r) => r.status === "pending"
              )}
            >
              Request owner access
            </button>
          </form>

          <Notice message={message} />

          {requests.map((r) => (
            <p key={r.id}>
              {r.status} ·{" "}
              {new Date(
                r.created_at
              ).toLocaleDateString()}
            </p>
          ))}
        </Panel>
      )}

      <div className="grid two space">
        <Panel title="Saved businesses">
          {saved.length ? (
            saved.map((s) => (
              <p key={s.business_id}>
                <Link
                  to={
                    "/stores/" + s.business_id
                  }
                >
                  {s.businesses?.name ||
                    s.business_id}
                </Link>
              </p>
            ))
          ) : (
            <p>No saved shops yet.</p>
          )}
        </Panel>

        <Panel title="Your enquiries">
          {enquiries.length ? (
            enquiries.map((q) => (
              <p key={q.id}>
                <b>{q.subject}</b> · {q.status}
                <br />
                <small>
                  {q.businesses?.name}
                </small>
              </p>
            ))
          ) : (
            <p>No enquiries yet.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ==========================================
   OWNER STUDIO
========================================== */

function Owner() {
  const auth = useAuth();

  const [shops, setShops] =
    useState<Business[]>([]);

  const [categories, setCategories] =
    useState<any[]>([]);

  const [locations, setLocations] =
    useState<any[]>([]);

  const [enquiries, setEnquiries] =
    useState<any[]>([]);

  const [metrics, setMetrics] =
    useState<any[]>([]);

  const [editing, setEditing] =
    useState<Business | null>(null);

  const { message, setMessage } = useNotice();

  async function load() {
    if (!auth.user) return;

    const [b, c, l, e, m] =
      await Promise.all([
        db.from("businesses")
          .select("*")
          .eq("owner_id", auth.user.id)
          .order("created_at", {
            ascending: false,
          }),

        db.from("categories").select("*"),

        db.from("locations").select("*"),

        db.from("enquiries")
          .select(
            "id,subject,message,status,business_id,created_at"
          )
          .order("created_at", {
            ascending: false,
          }),

        db.from("business_metrics")
          .select("*")
          .order("period_start", {
            ascending: false,
          }),
      ]);

    setShops(b.data || []);
    setCategories(c.data || []);
    setLocations(l.data || []);
    setEnquiries(e.data || []);
    setMetrics(m.data || []);
  }

  useEffect(() => {
    load();
  }, [auth.user?.id]);

  async function save(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const f = new FormData(formElement);

    const { error } = await db.rpc(
      "save_business_draft",
      {
        p_business: editing?.id || null,
        p_name: String(f.get("name")),
        p_category: String(
          f.get("category")
        ),
        p_location: String(
          f.get("location")
        ),
        p_description: String(
          f.get("description")
        ),
        p_phone: String(f.get("phone")),
        p_email: String(f.get("email")),
        p_address: String(
          f.get("address")
        ),
      }
    );

    setMessage(
      error
        ? error.message
        : "Draft saved. Submit it for approval when ready."
    );

    if (!error) {
      setEditing(null);
      formElement.reset();
      load();
    }
  }

  async function submitBusiness(id: string) {
    const { error } = await db.rpc(
      "submit_business",
      {
        p_business: id,
      }
    );

    setMessage(
      error
        ? error.message
        : "Submitted for admin approval."
    );

    load();
  }

  async function changeEnquiry(
    id: string,
    status: string
  ) {
    const { error } = await db.rpc(
      "set_enquiry_status",
      {
        p_enquiry: id,
        p_status: status,
      }
    );

    setMessage(
      error
        ? error.message
        : "Enquiry updated."
    );

    load();
  }

  async function addMetric(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const f = new FormData(formElement);

    const { error } = await db.rpc(
      "add_owner_metric",
      {
        p_business: String(
          f.get("business")
        ),
        p_start: String(f.get("start")),
        p_end: String(f.get("end")),
        p_revenue: Number(
          f.get("revenue")
        ),
        p_customers: Number(
          f.get("customers")
        ),
      }
    );

    setMessage(
      error
        ? error.message
        : "Owner-reported metric saved."
    );

    if (!error) {
      formElement.reset();
      load();
    }
  }

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          BUSINESS OWNER
        </span>

        <h1>Owner Studio</h1>

        <p>
          Create listings, track verification,
          manage enquiries and report performance.
        </p>
      </div>

      <Notice message={message} />

      <div className="grid three">
        <Stat
          title="My shops"
          value={shops.length}
        />

        <Stat
          title="Approved"
          value={
            shops.filter(
              (s) => s.status === "approved"
            ).length
          }
        />

        <Stat
          title="Received enquiries"
          value={enquiries.length}
        />
      </div>

      <div className="grid two space">
        <Panel
          title={
            editing
              ? "Edit draft"
              : "Create business draft"
          }
        >
          <form
            className="form"
            onSubmit={save}
            key={editing?.id || "new"}
          >
            <label>
              Business name
              <input
                name="name"
                defaultValue={
                  editing?.name || ""
                }
                required
                minLength={2}
              />
            </label>

            <label>
              Category
              <select
                name="category"
                defaultValue={
                  editing?.category_id || ""
                }
                required
              >
                <option value="">
                  Choose category
                </option>

                {categories.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Location
              <select
                name="location"
                defaultValue={
                  editing?.location_id || ""
                }
                required
              >
                <option value="">
                  Choose locality
                </option>

                {locations.map((l) => (
                  <option
                    key={l.id}
                    value={l.id}
                  >
                    {l.name}, {l.city}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Description
              <textarea
                name="description"
                defaultValue={
                  editing?.description || ""
                }
              />
            </label>

            <label>
              Phone
              <input
                name="phone"
                defaultValue={
                  editing?.phone || ""
                }
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={
                  editing?.email || ""
                }
              />
            </label>

            <label>
              Address
              <input
                name="address"
                defaultValue={
                  editing?.address || ""
                }
              />
            </label>

            <div className="actions">
              <button className="button primary">
                Save draft
              </button>

              {editing && (
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    setEditing(null)
                  }
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Panel>

        <Panel title="My listings">
          {shops.length ? (
            shops.map((s) => (
              <div
                className="listrow"
                key={s.id}
              >
                <div>
                  <b>{s.name}</b>
                  <br />
                  <span className="badge">
                    {s.status}
                  </span>
                </div>

                <div className="actions">
                  {[
                    "draft",
                    "rejected",
                  ].includes(s.status) && (
                    <>
                      <button
                        className="button"
                        onClick={() =>
                          setEditing(s)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="button primary"
                        onClick={() =>
                          submitBusiness(s.id)
                        }
                      >
                        Submit
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>
              No shops yet. Create your first draft.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid two space">
        <Panel title="Customer enquiries">
          {enquiries.length ? (
            enquiries.map((e) => (
              <div
                className="listrow"
                key={e.id}
              >
                <div>
                  <b>{e.subject}</b>
                  <p>{e.message}</p>
                  <small>{e.status}</small>
                </div>

                <select
                  value={e.status}
                  onChange={(x) =>
                    changeEnquiry(
                      e.id,
                      x.target.value
                    )
                  }
                >
                  <option value="open">
                    Open
                  </option>

                  <option value="in_progress">
                    In progress
                  </option>

                  <option value="resolved">
                    Resolved
                  </option>

                  <option value="closed">
                    Closed
                  </option>
                </select>
              </div>
            ))
          ) : (
            <p>No enquiries received.</p>
          )}
        </Panel>

        <Panel title="Owner-reported metrics">
          <p className="hint">
            Figures are owner-reported and
            are not audited.
          </p>

          <form
            className="form"
            onSubmit={addMetric}
          >
            <label>
              Business
              <select
                name="business"
                required
              >
                <option value="">
                  Select approved shop
                </option>

                {shops
                  .filter(
                    (s) =>
                      s.status === "approved"
                  )
                  .map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Period start
              <input
                type="date"
                name="start"
                required
              />
            </label>

            <label>
              Period end
              <input
                type="date"
                name="end"
                required
              />
            </label>

            <label>
              Reported turnover (₹)
              <input
                type="number"
                name="revenue"
                min="0"
                step="0.01"
                required
              />
            </label>

            <label>
              Customers
              <input
                type="number"
                name="customers"
                min="0"
              />
            </label>

            <button className="button primary">
              Add report
            </button>
          </form>

          {metrics.map((m) => (
            <div
              className="listrow"
              key={m.id}
            >
              <span>
                {m.period_start} –{" "}
                {m.period_end}
                <br />
                <small>{m.source}</small>
              </span>

              <b>
                {money(
                  Number(
                    m.reported_revenue ||
                      m.estimated_revenue ||
                      0
                  )
                )}
              </b>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}

/* ==========================================
   ADMIN CONSOLE
========================================== */

function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<Business[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);

  const [uq, setUq] = useState("");
  const [sq, setSq] = useState("");

  const { message, setMessage } = useNotice();

  async function load() {
    const [u, s, r, p, e, c] =
      await Promise.all([
        db.rpc("admin_user_report"),
        db.rpc("admin_shop_report"),

        db.from("owner_requests")
          .select("*")
          .eq("status", "pending"),

        db.from("businesses")
          .select("*")
          .eq("status", "pending"),

        db.from("enquiries")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        db.from("app_settings")
          .select("*"),
      ]);

    setUsers(u.data || []);
    setShops(s.data || []);
    setRequests(r.data || []);
    setPending(p.data || []);
    setEnquiries(e.data || []);
    setSettings(c.data || []);

    if (u.error) {
      setMessage(u.error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(
    type: "owner" | "business",
    id: string,
    approve: boolean
  ) {
    const note =
      prompt("Review note (optional)") || "";

    const { error } = await db.rpc(
      type === "owner"
        ? "review_owner_request"
        : "review_business",
      type === "owner"
        ? {
            p_request: id,
            p_approve: approve,
            p_note: note,
          }
        : {
            p_business: id,
            p_approve: approve,
            p_note: note,
          }
    );

    setMessage(
      error
        ? error.message
        : "Decision saved."
    );

    load();
  }

  async function setting(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const f = new FormData(e.currentTarget);

    const key = String(f.get("key"));
    const value = String(f.get("value"));

    const { error } = await db.rpc(
      "admin_set_setting",
      {
        p_key: key,
        p_value:
          key === "allow_public_enquiries"
            ? value === "true"
            : value,
      }
    );

    setMessage(
      error
        ? error.message
        : "Setting updated."
    );

    load();
  }

  const categoryCounts = Object.entries(
    shops.reduce(
      (
        acc: Record<string, number>,
        s: any
      ) => ({
        ...acc,
        [s.category_id]:
          (acc[s.category_id] || 0) + 1,
      }),
      {}
    )
  ).map(([category, count]) => ({
    category: category.slice(0, 8),
    count,
  }));

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          ADMIN ONLY
        </span>

        <h1>Platform intelligence</h1>

        <p>
          Account and shop oversight,
          approval queues, customer engagement
          and platform settings.
        </p>
      </div>

      <Notice message={message} />

      <div className="grid four">
        <Stat
          title="Users"
          value={users.length}
        />

        <Stat
          title="All shops"
          value={shops.length}
        />

        <Stat
          title="Pending listings"
          value={pending.length}
        />

        <Stat
          title="Enquiries"
          value={enquiries.length}
        />
      </div>

      <div className="grid two space">
        <Panel
          title="Owner access requests"
          aside={
            <span className="badge">
              {requests.length} pending
            </span>
          }
        >
          {requests.length ? (
            requests.map((r) => (
              <div
                className="listrow"
                key={r.id}
              >
                <div>
                  <b>
                    {users.find(
                      (u) =>
                        u.id === r.user_id
                    )?.full_name ||
                      r.user_id}
                  </b>

                  <p>{r.reason}</p>
                </div>

                <div className="actions">
                  <button
                    className="button primary"
                    onClick={() =>
                      decide(
                        "owner",
                        r.id,
                        true
                      )
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="button"
                    onClick={() =>
                      decide(
                        "owner",
                        r.id,
                        false
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No pending owner requests.</p>
          )}
        </Panel>

        <Panel
          title="Business verification queue"
          aside={
            <span className="badge">
              {pending.length} pending
            </span>
          }
        >
          {pending.length ? (
            pending.map((b) => (
              <div
                className="listrow"
                key={b.id}
              >
                <div>
                  <b>{b.name}</b>
                  <p>{b.description}</p>

                  <small>
                    Owner:{" "}
                    {users.find(
                      (u) =>
                        u.id === b.owner_id
                    )?.full_name ||
                      b.owner_id}
                  </small>
                </div>

                <div className="actions">
                  <button
                    className="button primary"
                    onClick={() =>
                      decide(
                        "business",
                        b.id,
                        true
                      )
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="button"
                    onClick={() =>
                      decide(
                        "business",
                        b.id,
                        false
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>
              No pending business submissions.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid two space">
        <Panel
          title="Individual user analysis"
          aside={
            <input
              value={uq}
              onChange={(e) =>
                setUq(e.target.value)
              }
              placeholder="Search users"
              aria-label="Search users"
            />
          }
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Shops</th>
                  <th>Enquiries</th>
                  <th>Events</th>
                  <th>Last event</th>
                </tr>
              </thead>

              <tbody>
                {users
                  .filter((u) =>
                    (
                      String(
                        u.full_name || ""
                      ) +
                      " " +
                      u.role
                    )
                      .toLowerCase()
                      .includes(
                        uq.toLowerCase()
                      )
                  )
                  .map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.full_name ||
                          u.id.slice(0, 8)}
                      </td>

                      <td>{u.role}</td>
                      <td>{u.businesses_owned}</td>
                      <td>{u.enquiries_sent}</td>
                      <td>{u.recorded_events}</td>

                      <td>
                        {u.last_recorded_activity
                          ? new Date(
                              u.last_recorded_activity
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Individual shop analysis"
          aside={
            <input
              value={sq}
              onChange={(e) =>
                setSq(e.target.value)
              }
              placeholder="Search shops"
              aria-label="Search shops"
            />
          }
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Enquiries</th>
                  <th>Saves</th>
                </tr>
              </thead>

              <tbody>
                {shops
                  .filter((s) =>
                    s.name
                      .toLowerCase()
                      .includes(
                        sq.toLowerCase()
                      )
                  )
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.status}</td>
                      <td>{s.profile_views}</td>
                      <td>{s.enquiries}</td>
                      <td>{s.bookmarks}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid two space">
        <Panel title="Category-level shop counts">
          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart data={categoryCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis allowDecimals={false} />
              <Tooltip />

              <Bar
                dataKey="count"
                fill="var(--accent)"
              />
            </BarChart>
          </ResponsiveContainer>

          <p className="hint">
            Category identifiers are abbreviated
            in this chart.
          </p>
        </Panel>

        <Panel title="Site settings">
          {settings
            .filter((s) =>
              [
                "site_name",
                "pilot_location",
                "allow_public_enquiries",
              ].includes(s.key)
            )
            .map((s) => (
              <form
                className="settingsrow"
                key={s.key}
                onSubmit={setting}
              >
                <input
                  type="hidden"
                  name="key"
                  value={s.key}
                />

                <label>
                  {s.key}

                  {s.key ===
                  "allow_public_enquiries" ? (
                    <select
                      name="value"
                      defaultValue={String(
                        s.value
                      )}
                    >
                      <option value="false">
                        False
                      </option>

                      <option value="true">
                        True
                      </option>
                    </select>
                  ) : (
                    <input
                      name="value"
                      defaultValue={String(
                        s.value
                      )}
                      minLength={2}
                      maxLength={100}
                    />
                  )}
                </label>

                <button className="button">
                  Save
                </button>
              </form>
            ))}
        </Panel>
      </div>
    </>
  );
}

/* ==========================================
   ANALYST WORKSPACE
========================================== */

function Analyst() {
  const { message, setMessage } =
    useNotice();

  useEffect(() => {
    Promise.all([
      db.rpc("admin_shop_report"),
      db.rpc("admin_user_report"),
    ]).then(([s, u]) => {
      if (s.error || u.error) {
        setMessage(
          "Analyst access is restricted to approved aggregate reports. Contact admin for a scoped reporting API."
        );
      }
    });
  }, []);

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          MARKET ANALYST
        </span>

        <h1>Research workspace</h1>

        <p>
          Market opportunity modelling and
          category analysis.
        </p>
      </div>

      <Notice message={message} />

      <Insights />

      <p className="hint">
        Raw account-level analytics are reserved
        for administrators. A production analyst
        API should return aggregated,
        de-identified results.
      </p>
    </>
  );
}

/* ==========================================
   MARKET INSIGHTS
========================================== */

function Insights() {
  const [customers, setCustomers] =
    useState(100);

  const [bill, setBill] = useState(100);
  const [days, setDays] = useState(26);
  const [margin, setMargin] = useState(12);

  const revenue =
    customers * bill * days;

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          TRANSPARENT MODELLING
        </span>

        <h1>Market Insights</h1>

        <p>
          Model potential turnover with assumptions
          you control. These are not actual store
          financial records.
        </p>
      </div>

      <div className="grid two">
        <Panel title="Monthly revenue estimator">
          <div className="form">
            <label>
              Customers per day
              <input
                type="number"
                min={0}
                max={100000}
                value={customers}
                onChange={(e) =>
                  setCustomers(
                    Math.max(
                      0,
                      +e.target.value
                    )
                  )
                }
              />
            </label>

            <label>
              Average bill (₹)
              <input
                type="number"
                min={0}
                max={10000000}
                value={bill}
                onChange={(e) =>
                  setBill(
                    Math.max(
                      0,
                      +e.target.value
                    )
                  )
                }
              />
            </label>

            <label>
              Operating days
              <input
                type="number"
                min={0}
                max={31}
                value={days}
                onChange={(e) =>
                  setDays(
                    Math.max(
                      0,
                      Math.min(
                        31,
                        +e.target.value
                      )
                    )
                  )
                }
              />
            </label>

            <label>
              Operating margin (%)
              <input
                type="number"
                min={0}
                max={100}
                value={margin}
                onChange={(e) =>
                  setMargin(
                    Math.max(
                      0,
                      Math.min(
                        100,
                        +e.target.value
                      )
                    )
                  )
                }
              />
            </label>
          </div>

          <div className="result">
            <small>
              Modelled monthly turnover
            </small>

            <strong>
              {money(revenue)}
            </strong>

            <small>
              Estimated operating income:{" "}
              {money(
                (revenue * margin) / 100
              )}
            </small>
          </div>
        </Panel>

        <Panel title="Methodology">
          <p>
            <b>
              Turnover = customers/day ×
              average bill × operating days.
            </b>
          </p>

          <p>
            Estimated operating income applies
            your assumed operating margin.
            Validate assumptions with field surveys,
            footfall counts, rent quotes
            and competitor research.
          </p>

          <p>
            Owner-reported data is stored separately
            and is never described as audited
            financial performance.
          </p>
        </Panel>
      </div>
    </>
  );
}

/* ==========================================
   OPPORTUNITIES
========================================== */

function Opportunities() {
  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">
          OPPORTUNITY EXPLORER
        </span>

        <h1>Ideas worth validating</h1>

        <p>
          Research hypotheses, not guaranteed
          investments.
        </p>
      </div>

      <div className="grid three">
        <Panel title="Express printing hub">
          <p>
            Test student demand, queue times,
            delivery and project-binding services.
          </p>
        </Panel>

        <Panel title="Affordable meal service">
          <p>
            Validate repeat purchases among
            healthcare visitors and nearby workers.
          </p>
        </Panel>

        <Panel title="Laundry subscription">
          <p>
            Research pickup density, retention
            and unit economics.
          </p>
        </Panel>
      </div>
    </>
  );
}

export default App;