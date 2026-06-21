import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Laptop, Cpu, ShieldCheck, CreditCard, Truck, BadgePercent, CheckCircle2, 
  Menu, X, Send, Award, Users, RefreshCw, BarChart2, Plus, Trash, Eye, 
  Building2, ArrowRight, Download, FileSpreadsheet, Lock, Sparkles, MapPin, Phone, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Configure Axios Defaults
axios.defaults.withCredentials = true;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://itasset-buyback.preview.emergentagent.com";
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// Nav Header Component
const Header = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Services", path: "/services" },
    { name: "Sell Your Equipment", path: "/sell" },
    { name: "Get a Quote", path: "/quote" },
    { name: "Contact Us", path: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo-link">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1B3D] text-[#10B981]">
              <Cpu className="h-6 w-6" />
            </div>
            <span className="font-heading font-extrabold text-xl text-[#0B1B3D] tracking-tight">ReIT <span className="text-[#10B981]">India</span></span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              data-testid={`nav-link-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-sm font-semibold transition-colors duration-200 hover:text-[#10B981] ${
                location.pathname === link.path ? "text-[#10B981]" : "text-gray-600"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link to="/admin" data-testid="nav-admin-dashboard-link">
                  <Button variant="outline" className="border-[#0B1B3D] text-[#0B1B3D] hover:bg-[#0B1B3D]/10">
                    <BarChart2 className="mr-2 h-4 w-4" /> Admin Panel
                  </Button>
                </Link>
              )}
              <Button data-testid="nav-logout-btn" onClick={logout} variant="ghost" className="text-gray-600 hover:text-[#0B1B3D]">
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login" data-testid="nav-login-link">
              <Button variant="outline" className="border-[#0B1B3D] text-[#0B1B3D] hover:bg-[#0B1B3D]/10">
                <Lock className="mr-2 h-4 w-4" /> Client Login
              </Button>
            </Link>
          )}
          <Link to="/quote" data-testid="nav-cta-quote-link">
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white shadow-md">
              Get Free Valuation
            </Button>
          </Link>
        </div>

        <button 
          data-testid="mobile-menu-toggle-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-[#0B1B3D]"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 py-4 space-y-3" data-testid="mobile-nav-menu">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-gray-700 hover:text-[#10B981]"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-gray-200 flex flex-col gap-3">
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-[#0B1B3D] text-[#0B1B3D]">
                      <BarChart2 className="mr-2 h-4 w-4" /> Admin Panel
                    </Button>
                  </Link>
                )}
                <Button onClick={() => { logout(); setMobileMenuOpen(false); }} variant="ghost" className="w-full text-gray-600">
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-[#0B1B3D] text-[#0B1B3D]">
                  <Lock className="mr-2 h-4 w-4" /> Client Login
                </Button>
              </Link>
            )}
            <Link to="/quote" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-[#10B981] hover:bg-[#059669] text-white">
                Get Free Valuation
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-[#0B1B3D] text-white py-20 px-4 sm:px-6">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-[#10B981]">
              <Cpu className="h-6 w-6" />
            </div>
            <span className="font-heading font-extrabold text-xl tracking-tight">ReIT <span className="text-[#10B981]">India</span></span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            India&apos;s trusted enterprise-grade IT asset disposition (ITAD) partner. We purchase end-of-life laptops, servers, and infrastructure from companies, banks, and universities nationwide.
          </p>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4 text-[#10B981]">Core Offerings</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>Enterprise IT Buyback</li>
            <li>Secure Data Erasure</li>
            <li>E-Waste Recycling</li>
            <li>Office IT Liquidation</li>
            <li>Custom Logistics & Pickups</li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4 text-[#10B981]">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link to="/about" className="hover:text-[#10B981] transition-colors">About Us</Link></li>
            <li><Link to="/services" className="hover:text-[#10B981] transition-colors">Our Services</Link></li>
            <li><Link to="/sell" className="hover:text-[#10B981] transition-colors">Sell Equipment</Link></li>
            <li><Link to="/quote" className="hover:text-[#10B981] transition-colors">Get Quotation</Link></li>
            <li><Link to="/contact" className="hover:text-[#10B981] transition-colors">Contact Support</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4 text-[#10B981]">Corporate Office</h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            ReIT India Tech Park<br />
            Level 5, Sector V, Salt Lake City<br />
            Kolkata, WB - 700091<br />
            <span className="block mt-2 font-semibold">📞 +91 33 4001 8899</span>
            <span className="block font-semibold">✉️ corporate@reitindia.com</span>
          </p>
        </div>
      </div>
      <div className="container mx-auto mt-16 pt-8 border-t border-white/10 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} ReIT India. All Rights Reserved. ISO 27001 & R2v3 Certified ITAD Partner.</p>
      </div>
    </footer>
  );
};

// Home View
const HomeView = () => {
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative py-24 sm:py-32 overflow-hidden bg-[#0B1B3D] text-white">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://images.pexels.com/photos/17489157/pexels-photo-17489157.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
            alt="Servers" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <Badge className="bg-[#10B981] text-white text-xs px-3 py-1 font-semibold uppercase tracking-wider rounded-full">
              Trusted Enterprise ITAD Partner
            </Badge>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none text-white">
              Fair Market Value for <span className="text-[#10B981]">Enterprise IT Assets</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
              We purchase used laptops, computers, servers, networking hardware, and printers from corporate, government, educational, and institutional partners across India. Get instant valuations and seamless logistics.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/quote" data-testid="hero-get-quote-link">
                <Button className="bg-[#10B981] hover:bg-[#059669] text-white text-base px-8 py-6 rounded-lg font-bold shadow-lg transition-transform hover:-translate-y-1">
                  Get Free Valuation
                </Button>
              </Link>
              <Link to="/sell" data-testid="hero-sell-equipment-link">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 text-base px-8 py-6 rounded-lg font-bold transition-transform hover:-translate-y-1">
                  Sell Your IT Equipment Today
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
              <h3 className="font-heading font-bold text-xl text-[#10B981] mb-4">Our Integrity Guarantee</h3>
              <ul className="space-y-4 text-left">
                {[
                  { title: "Fair Asset Assessment", desc: "No scrap-dealer rates. We pay certified market-value on functional/refurbishable assets." },
                  { title: "Military-Grade Data Erasure", desc: "100% compliance with NIST SP 800-88 standards for data sanitization." },
                  { title: "Eco-Friendly Recycling", desc: "Certified R2v3 protocols ensuring zero-landfill e-waste solutions." }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <ShieldCheck className="h-6 w-6 text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.title}</h4>
                      <p className="text-xs text-gray-300">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#0B1B3D]">
            The ReIT India Corporate Edge
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Maximize return on investment with a streamlined, compliant, and professional asset disposition strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Cpu, title: "Fair Market Valuations", desc: "We grade components dynamically, ensuring top dollar for laptops, memory, CPUs, and enterprise-grade networking gears based on reusable condition." },
            { icon: ShieldCheck, title: "Certified Data Destruction", desc: "Guaranteed deletion of company and client files. Receives comprehensive Certificate of Data Erasure for every device processed." },
            { icon: Truck, title: "Seamless Doorstep Pickup", desc: "Our reliable nationwide logistics teams handle packing, loading, and transit from any site, office branch, or IT hub across India." }
          ].map((feat, idx) => (
            <Card key={idx} className="hover:-translate-y-1 transition-transform duration-200 border border-gray-200 shadow-sm" data-testid={`prop-card-${idx}`}>
              <CardContent className="p-8 space-y-4 text-left">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B1B3D]/10 text-[#0B1B3D]">
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-extrabold text-xl text-[#0B1B3D]">{feat.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories We Purchase */}
      <section className="bg-gray-50 py-20 px-4 sm:px-6">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#0B1B3D]">
              Complete Spectrum of Recoverable IT Assets
            </h2>
            <p className="text-gray-600 leading-relaxed text-base">
              From desktop workstation fleets to whole backend data centers, we help modern firms recover equity on working, decommissioned, and end-of-service machines.
            </p>
            <ul className="space-y-3">
              {["Corporate Notebooks & Workstations", "Enterprise Servers & Rack Infrastructure", "Core Routers, Switches & Firewall units", "Industrial & Office Printer fleets"].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 font-bold text-[#0B1B3D]">
                  <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Link to="/sell">
                <Button className="bg-[#0B1B3D] hover:bg-[#162B5C] text-white">
                  Learn What We Purchase <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { category: "Laptops & Desktops", count: "10+ units minimum", note: "i5, i7, Xeon models" },
              { category: "Datacenter Servers", count: "Any rack configurations", note: "Dell, HP, Cisco, Lenovo" },
              { category: "Networking Hardware", count: "Switches, Firewalls, SANs", note: "Juniper, Fortinet, Cisco" },
              { category: "Printers & Peripherals", count: "High-volume laser printer fleets", note: "HP, Canon, Xerox" }
            ].map((cat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 text-left shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-heading font-bold text-lg text-[#0B1B3D]">{cat.category}</h4>
                <div className="text-[#10B981] font-bold text-sm mt-1">{cat.count}</div>
                <div className="text-gray-500 text-xs mt-2">{cat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple Step Process */}
      <section className="container mx-auto px-4 sm:px-6 text-center space-y-16">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#0B1B3D]">How It Works</h2>
          <p className="text-gray-600 text-base">Simple 4-step deployment cycle for liquidating enterprise tech</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Submit Assets", desc: "Use our interactive valuation system or upload an Excel inventory list." },
            { step: "02", title: "Review Offer", desc: "Our asset experts return an itemized commercial purchase valuation within 24 hours." },
            { step: "03", title: "Secure Logistics", desc: "We schedule complete doorstep packing, removal, and transfer with absolute zero transport fee." },
            { step: "04", title: "Instant Settlement", desc: "Get paid instantly via Bank Transfer or UPI upon successful data erasure and physical audit." }
          ].map((step, idx) => (
            <div key={idx} className="space-y-4 text-left p-6 bg-white rounded-xl border border-gray-200" data-testid={`step-card-${idx}`}>
              <div className="text-[#10B981] font-heading font-extrabold text-4xl">{step.step}</div>
              <h3 className="font-heading font-bold text-lg text-[#0B1B3D]">{step.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// About Us View
const AboutView = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-20 space-y-20 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <Badge className="bg-[#10B981] text-white">About ReIT India</Badge>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#0B1B3D] tracking-tight">
            Enterprise Integrity & Sustainable ITAD Solutions
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            Founded with the explicit mandate to provide professional, institutional-grade IT Asset Disposition (ITAD) across India, ReIT India ensures high residual returns on your retired technology. We are NOT scrap dealers. We specialize in components recycling, server refurbishment, and environmental stewardship.
          </p>
          <p className="text-gray-600 text-base leading-relaxed">
            Our operational centers are strategically positioned across major metros including Mumbai, Bangalore, NCR, and Kolkata, allowing us to manage high-volume logistics and rapid hardware audits seamlessly. We protect your company reputation with certifiable data destruction and absolute compliance with both national and international e-waste mandates.
          </p>
        </div>
        <div className="lg:col-span-5 bg-gray-100 rounded-2xl overflow-hidden aspect-video relative">
          <img 
            src="https://images.pexels.com/photos/7693692/pexels-photo-7693692.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" 
            alt="Business Meet" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
        {[
          { title: "Compliant & Licensed", desc: "Full statutory compliance with Central Pollution Control Board (CPCB) directives, certified for secure hardware sanitization and e-waste management." },
          { title: "National Operations", desc: "Operating on-ground logistics fleets in all 28 states and union territories, delivering swift doorstep inspection and immediate payouts." },
          { title: "Maximum Residual Return", desc: "Our real-time component auditing algorithms guarantee optimal market valuations, capturing maximum residual value on your active inventory." }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm space-y-4">
            <h3 className="font-heading font-extrabold text-lg text-[#0B1B3D]">{item.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Services View
const ServicesView = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-20 text-left space-y-16">
      <div className="max-w-3xl space-y-4">
        <Badge className="bg-[#10B981] text-white">Full-Suite Capabilities</Badge>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#0B1B3D] tracking-tight">
          Enterprise IT Asset Services
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          ReIT India offers customizable operational tracks for secure asset collection, sorting, auditing, value estimation, data scrubbing, and ethical product lifecycle handling.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { title: "Corporate Asset Buybacks", desc: "Efficient inventory buyout programs for massive multi-floor workstation configurations, laptop upgrades, and complete corporate fleet refresh cycles." },
          { title: "Secure Datacenter Liquidation", desc: "Complete architectural decommissioning of server cabinets, storage SANs, network arrays, and environmental infrastructure with certified on-site hardware dismantling." },
          { title: "R2v3 Standard E-Waste Logistics", desc: "Strictly regulated environmental sorting ensuring raw component separation and completely clean recovery pathways for unserviceable machinery." },
          { title: "NIST 800-88 Data Sanitization", desc: "Deploying high-level hard-disk overwriting, degaussing, and physical shredding protocols, with comprehensive Certificate of Data Destruction provided for every machine." }
        ].map((srv, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <h3 className="font-heading font-extrabold text-xl text-[#0B1B3D]">{srv.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{srv.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sell Your Equipment View
const SellView = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-20 text-left space-y-16">
      <div className="max-w-3xl space-y-4">
        <Badge className="bg-[#10B981] text-white">Acceptable Hardware List</Badge>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#0B1B3D] tracking-tight">
          What We Buy
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          We process enterprise-grade machines from corporate environments. Check our general requirements and minimum order quantities below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Workstations & Laptops", items: ["Core i3 / i5 / i7 / i9 Laptops", "MacBook Pro & Air Models", "All-in-One Workstations", "Enterprise PC Mini-Towers"], moq: "Min Quantity: 10 units" },
          { title: "Datacenter Hardware", items: ["1U/2U Rackmount Servers", "Blade chassis arrays", "Network Attached Storage (NAS)", "ECC Memory & RAID Cards"], moq: "Min Quantity: 3 units" },
          { title: "Networking Gears", items: ["Cisco & Juniper Switches", "Enterprise Firewalls", "Wireless Access Controllers", "Fiber Optic Transceivers"], moq: "Min Quantity: 5 units" },
          { title: "Peripherals & Printers", items: ["Industrial Laser Printers", "Multi-function copiers", "Corporate VOIP Phones", "Uninterrupted Power Supplies"], moq: "Min Quantity: 5 units" }
        ].map((cat, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-6 rounded-xl flex flex-col justify-between shadow-sm space-y-4">
            <div className="space-y-3">
              <h3 className="font-heading font-bold text-lg text-[#0B1B3D] border-b border-gray-100 pb-2">{cat.title}</h3>
              <ul className="space-y-2">
                {cat.items.map((item, i_idx) => (
                  <li key={i_idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0B1B3D]/5 text-[#0B1B3D] font-bold text-xs p-2 rounded text-center">
              {cat.moq}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-heading font-extrabold text-xl text-[#0B1B3D]">Have a specialized list of custom hardware configurations?</h3>
          <p className="text-gray-600 text-sm">We buy specialized network boards, SAN appliances, industrial lab servers, and custom workstation builds. Just upload your inventory spreadsheet directly.</p>
        </div>
        <div className="text-right">
          <Link to="/quote">
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white w-full lg:w-auto font-bold py-6 px-8 text-base">
              Submit Custom Catalog
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Valuation Calculator & Quotation Form
const QuoteView = () => {
  const [items, setItems] = useState([
    { category: "Laptops", specification: "", condition: "Working - Excellent", quantity: 10, estimated_value: 12000 }
  ]);
  
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = [
    { name: "Laptops", baseVal: 12000 },
    { name: "Desktops", baseVal: 8000 },
    { name: "Servers", baseVal: 45000 },
    { name: "Networking Gears", baseVal: 20000 },
    { name: "Printers", baseVal: 6000 },
    { name: "Other ITAD Assets", baseVal: 5000 }
  ];

  const conditions = [
    { name: "Working - Like New", modifier: 1.2 },
    { name: "Working - Excellent", modifier: 1.0 },
    { name: "Working - Minor Wear", modifier: 0.8 },
    { name: "Functional - Medium Wear", modifier: 0.6 },
    { name: "Not Working - Parts Recovery Only", modifier: 0.25 }
  ];

  const handleAddItem = () => {
    setItems([...items, { category: "Laptops", specification: "", condition: "Working - Excellent", quantity: 10, estimated_value: 12000 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    
    // Recalculate estimated value
    const catObj = categories.find(c => c.name === updated[index].category) || { baseVal: 5000 };
    const condObj = conditions.find(c => c.name === updated[index].condition) || { modifier: 1.0 };
    updated[index].estimated_value = Math.round(catObj.baseVal * condObj.modifier);
    
    setItems(updated);
  };

  // Calculate total valuation
  const totalValuation = items.reduce((sum, item) => sum + (item.estimated_value * item.quantity), 0);

  // File mock upload simulation
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const mockPaths = files.map(file => `mock_uploads/${Date.now()}_${file.name}`);
    setUploadedFiles([...uploadedFiles, ...mockPaths]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    
    const payload = {
      client_name: clientName,
      company_name: companyName || null,
      email: email,
      phone: phone,
      city: city,
      equipment_items: items,
      custom_message: customMessage || null,
      uploaded_files: uploadedFiles
    };

    try {
      await axios.post(`${API}/quotes`, payload);
      setSubmitSuccess(true);
      setClientName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setCity("");
      setCustomMessage("");
      setUploadedFiles([]);
      setItems([{ category: "Laptops", specification: "", condition: "Working - Excellent", quantity: 10, estimated_value: 12000 }]);
    } catch (err) {
      setErrorMsg(formatApiErrorDetail(err.response?.data?.detail) || "Failed to submit quote. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-20 text-left space-y-16">
      <div className="max-w-3xl space-y-4">
        <Badge className="bg-[#10B981] text-white">Instant Estimation</Badge>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#0B1B3D] tracking-tight">
          Interactive IT Asset Valuation
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Configure your decommissioned equipment inventory using our estimator to view instant, transparent valuation guidelines before scheduling final pick-ups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Dynamic Calculator & Lead Form */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border border-gray-200">
            <CardHeader className="bg-[#0B1B3D]/5 border-b border-gray-200">
              <CardTitle className="font-heading font-extrabold text-lg text-[#0B1B3D]">1. Define Asset Inventory</CardTitle>
              <CardDescription className="text-gray-500 text-sm">Add each batch of devices. Values are estimated based on specifications and condition guidelines.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-gray-100 pb-6 last:border-b-0 last:pb-0" data-testid={`inventory-row-${idx}`}>
                  <div className="md:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-500">Category</Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(val) => handleItemChange(idx, "category", val)}
                      data-testid={`select-category-${idx}`}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-500">Spec/Model</Label>
                    <Input 
                      placeholder="e.g. Core i5, 8GB, 256GB" 
                      value={item.specification}
                      onChange={(e) => handleItemChange(idx, "specification", e.target.value)}
                      data-testid={`input-spec-${idx}`}
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-500">Condition</Label>
                    <Select 
                      value={item.condition} 
                      onValueChange={(val) => handleItemChange(idx, "condition", val)}
                      data-testid={`select-condition-${idx}`}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-500">Quantity</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                      data-testid={`input-qty-${idx}`}
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Button 
                      onClick={() => handleRemoveItem(idx)} 
                      disabled={items.length === 1}
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`remove-item-btn-${idx}`}
                    >
                      <Trash className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button onClick={handleAddItem} variant="outline" className="border-dashed border-gray-300 hover:border-[#10B981] text-gray-600 hover:text-[#10B981] w-full" data-testid="add-item-btn">
                <Plus className="mr-2 h-4 w-4" /> Add Asset Batch
              </Button>
            </CardContent>
          </Card>

          {/* Lead Contact Info Form */}
          <form onSubmit={handleSubmit}>
            <Card className="border border-gray-200">
              <CardHeader className="bg-[#0B1B3D]/5 border-b border-gray-200">
                <CardTitle className="font-heading font-extrabold text-lg text-[#0B1B3D]">2. Corporate Contact Details</CardTitle>
                <CardDescription className="text-gray-500 text-sm">Please provide business details to claim this valuation. All reports are confidential.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {submitSuccess && (
                  <div className="bg-[#10B981]/10 text-[#059669] p-4 rounded-lg font-bold flex items-center gap-2 mb-4" data-testid="valuation-success-banner">
                    <CheckCircle2 className="h-5 w-5" /> Valuation submitted successfully! Our audit team will connect shortly.
                  </div>
                )}
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg font-semibold text-sm" data-testid="valuation-error-banner">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="client_name">Your Name *</Label>
                    <Input 
                      id="client_name" 
                      required 
                      value={clientName} 
                      onChange={(e) => setClientName(e.target.value)}
                      data-testid="quote-client-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name">Company / Institution Name</Label>
                    <Input 
                      id="company_name" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)}
                      data-testid="quote-company-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Official Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="quote-email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Contact Number *</Label>
                    <Input 
                      id="phone" 
                      required 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      data-testid="quote-phone"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City / State *</Label>
                    <Input 
                      id="city" 
                      required 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)}
                      data-testid="quote-city"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom_message">Custom Requirements / Logistics requests</Label>
                  <Textarea 
                    id="custom_message" 
                    placeholder="Provide pickup floor, timeline, packaging, or special security clearance requirements..." 
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    data-testid="quote-custom-message"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="files">Upload Asset List or Photos (Excel, PDF, JPG)</Label>
                  <Input 
                    id="files" 
                    type="file" 
                    multiple 
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                    data-testid="quote-file-upload"
                  />
                  {uploadedFiles.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Uploaded files: {uploadedFiles.map(f => f.split('_').slice(1).join('_')).join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-6 flex justify-between items-center border-t border-gray-200">
                <p className="text-xs text-gray-500">By submitting, you consent to our certified data erasure policy terms.</p>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#10B981] hover:bg-[#059669] text-white font-bold"
                  data-testid="quote-submit-btn"
                >
                  {submitting ? "Submitting..." : "Submit Valuation Request"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

        {/* Real-Time Total Sticky Banner */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            <Card className="bg-[#0B1B3D] text-white overflow-hidden border-0 shadow-xl">
              <CardHeader className="bg-white/5 border-b border-white/10 py-6">
                <CardTitle className="font-heading font-extrabold text-base uppercase tracking-wider text-gray-300">Live Estimate Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-8 text-center space-y-6">
                <div className="space-y-1">
                  <div className="text-gray-300 text-sm font-semibold">Total Estimated Value Range</div>
                  <div className="text-[#10B981] font-heading font-extrabold text-4xl lg:text-5xl" data-testid="live-estimated-total">
                    ₹{(totalValuation * 0.95).toLocaleString('en-IN')} - ₹{(totalValuation * 1.05).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Estimations computed on live asset indexes</div>
                </div>
                
                <div className="border-t border-white/10 pt-4 text-left space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Total Device Batches</span>
                    <span className="font-bold">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Total Target Volume</span>
                    <span className="font-bold">{items.reduce((sum, i) => sum + i.quantity, 0)} units</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 p-6 space-y-4">
              <h4 className="font-heading font-bold text-[#0B1B3D]">Compliance Note</h4>
              <p className="text-gray-600 text-xs leading-relaxed">
                ReIT India guarantees complete professional certification of sanitization conforming to ISO 14001, 45001, and 27001 data sanitization. Hardware is audited and cleared securely under active supervision.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Us View
const ContactView = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-20 text-left space-y-16">
      <div className="max-w-3xl space-y-4">
        <Badge className="bg-[#10B981] text-white">Reach Our Team</Badge>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#0B1B3D] tracking-tight">
          Connect with ReIT India
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Need custom enterprise pricing models or high-volume physical inventory auditing? Speak directly with our asset collection engineers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <h3 className="font-heading font-extrabold text-xl text-[#0B1B3D]">Head Office Contacts</h3>
            <div className="space-y-3 text-gray-600">
              <p className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#10B981]" />
                <span>Sector V, Salt Lake, Kolkata, WB - 700091</span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#10B981]" />
                <span>+91 33 4001 8899 (Direct Support)</span>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[#10B981]" />
                <span>corporate@reitindia.com</span>
              </p>
            </div>
          </div>

          <div className="p-6 bg-[#0B1B3D]/5 rounded-xl border border-[#0B1B3D]/10">
            <h4 className="font-bold text-[#0B1B3D] text-sm uppercase mb-2">Metro Pick-up Logistics Hubs</h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li>📍 <strong>NCR:</strong> Okhla Phase III, New Delhi</li>
              <li>📍 <strong>Mumbai:</strong> MIDC Industrial Area, Andheri East</li>
              <li>📍 <strong>Bangalore:</strong> Whitefield Technology Cluster</li>
              <li>📍 <strong>Chennai:</strong> Guindy Industrial Estate</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Card className="border border-gray-200">
            <CardHeader className="bg-[#0B1B3D]/5 border-b border-gray-200">
              <CardTitle className="font-heading font-extrabold text-[#0B1B3D]">General Inquiries</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-4">
                {submitted && (
                  <div className="bg-[#10B981]/10 text-[#059669] p-4 rounded-lg font-bold flex items-center gap-2 mb-4" data-testid="contact-success-banner">
                    <CheckCircle2 className="h-5 w-5" /> Thank you for reaching out! We&apos;ve received your request and will reply within 4 hours.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input id="contact-name" required value={name} onChange={(e) => setName(e.target.value)} data-testid="contact-name-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input id="contact-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="contact-email-input" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea id="contact-message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="contact-message-input" />
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-6 flex justify-end border-t border-gray-200">
                <Button type="submit" className="bg-[#0B1B3D] hover:bg-[#162B5C] text-white" data-testid="contact-submit-btn">
                  Send Message
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Client / Admin Login
const LoginView = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setErrorMsg(formatApiErrorDetail(err.response?.data?.detail) || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-24 flex items-center justify-center">
      <Card className="w-full max-w-md border border-gray-200 shadow-lg text-left">
        <CardHeader className="space-y-1 bg-[#0B1B3D]/5 border-b border-gray-200 p-6">
          <CardTitle className="font-heading font-extrabold text-2xl text-[#0B1B3D]">Secure Portal Access</CardTitle>
          <CardDescription className="text-gray-500 text-sm">Log in to view corporate asset evaluations and lead audit queues.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="p-6 space-y-4">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold" data-testid="login-error">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Official Email</Label>
              <Input 
                id="login-email" 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input 
                id="login-password" 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
              />
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-gray-50 flex items-center justify-between border-t border-gray-200">
            <Link to="/" className="text-xs text-gray-500 hover:text-[#10B981]">Back to home</Link>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-[#0B1B3D] hover:bg-[#162B5C] text-white"
              data-testid="login-submit-button"
            >
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

// Admin Panel View
const AdminView = () => {
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
    } else {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [quotesRes, statsRes] = await Promise.all([
        axios.get(`${API}/quotes/admin`),
        axios.get(`${API}/quotes/admin/stats`)
      ]);
      setQuotes(quotesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setErrorMsg(formatApiErrorDetail(err.response?.data?.detail) || "Failed to load admin logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (quoteId, statusStr) => {
    try {
      await axios.patch(`${API}/quotes/admin/${quoteId}`, { status: statusStr });
      fetchAdminData();
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote(prev => ({ ...prev, status: statusStr }));
      }
    } catch (err) {
      alert("Failed to update status. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <RefreshCw className="animate-spin h-8 w-8 text-[#10B981] mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-semibold">Decrypting secure corporate audit ledger...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 text-left space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0B1B3D]" data-testid="admin-panel-heading">Enterprise Asset Ledger</h1>
          <p className="text-gray-500 text-sm">Under active audit governance. Real-time quote leads tracking.</p>
        </div>
        <Button onClick={fetchAdminData} variant="outline" className="border-gray-300">
          <RefreshCw className="mr-2 h-4 w-4" /> Reload Stream
        </Button>
      </div>

      {/* Analytics widgets */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="analytics-widgets">
          <Card className="border border-gray-200">
            <CardContent className="p-6 space-y-2">
              <div className="text-xs font-bold uppercase text-gray-500">Total Leads</div>
              <div className="text-3xl font-extrabold text-[#0B1B3D]" data-testid="stat-total-leads">{stats.total_quotes}</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-6 space-y-2">
              <div className="text-xs font-bold uppercase text-gray-500">Pending Evaluation</div>
              <div className="text-3xl font-extrabold text-amber-600" data-testid="stat-pending-leads">{stats.pending_quotes}</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-6 space-y-2">
              <div className="text-xs font-bold uppercase text-gray-500">Corporate Deals Paid</div>
              <div className="text-3xl font-extrabold text-[#10B981]" data-testid="stat-paid-leads">{stats.completed_quotes}</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-6 space-y-2">
              <div className="text-xs font-bold uppercase text-gray-500">Total Asset Valuation</div>
              <div className="text-2xl font-extrabold text-[#0B1B3D]" data-testid="stat-total-valuation">₹{stats.total_valuation.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main ledger table and detail split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={`${selectedQuote ? "lg:col-span-7" : "lg:col-span-12"} space-y-6`}>
          <Card className="border border-gray-200 overflow-hidden">
            <CardHeader className="bg-[#0B1B3D]/5 border-b border-gray-200 flex flex-row items-center justify-between p-6">
              <div>
                <CardTitle className="font-heading font-extrabold text-base text-[#0B1B3D]">Purchase Leads</CardTitle>
                <CardDescription className="text-gray-500 text-xs">Real-time valuation queries from institutions</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse" data-testid="leads-table">
                  <thead className="bg-gray-50 text-[#0B1B3D] font-bold uppercase text-xs border-b border-gray-200">
                    <tr>
                      <th className="p-4">Client</th>
                      <th className="p-4">City</th>
                      <th className="p-4">Est. Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotes.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-500">Zero evaluation records present in database.</td>
                      </tr>
                    ) : (
                      quotes.map((q) => (
                        <tr key={q.id} className={`hover:bg-gray-50 cursor-pointer ${selectedQuote?.id === q.id ? "bg-gray-50" : ""}`} onClick={() => setSelectedQuote(q)}>
                          <td className="p-4">
                            <div className="font-bold text-[#0B1B3D]">{q.client_name}</div>
                            <div className="text-xs text-gray-500">{q.company_name || "Individual"}</div>
                          </td>
                          <td className="p-4 text-gray-600">{q.city}</td>
                          <td className="p-4 font-bold text-[#0B1B3D]">₹{q.estimated_total.toLocaleString('en-IN')}</td>
                          <td className="p-4">
                            <Badge className={
                              q.status === "Pending Evaluation" ? "bg-amber-100 text-amber-800" :
                              q.status === "Approved" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                            }>
                              {q.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="border-gray-300" onClick={() => setSelectedQuote(q)}>
                              <Eye className="h-4 w-4" /> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Details Side Panel */}
        {selectedQuote && (
          <div className="lg:col-span-5 space-y-6">
            <Card className="border border-gray-200 text-left relative" data-testid="lead-details-card">
              <button 
                onClick={() => setSelectedQuote(null)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                data-testid="close-lead-details-btn"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="bg-[#0B1B3D]/5 border-b border-gray-200">
                <CardTitle className="font-heading font-extrabold text-lg text-[#0B1B3D]">Lead Specifications</CardTitle>
                <CardDescription className="text-gray-500 text-xs">Submitted on {new Date(selectedQuote.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Client contacts */}
                <div className="space-y-2 border-b border-gray-100 pb-4">
                  <div className="text-sm font-bold text-[#0B1B3D]">{selectedQuote.client_name}</div>
                  <div className="text-xs text-gray-500">Company: {selectedQuote.company_name || "N/A"}</div>
                  <div className="text-xs text-gray-500">Email: {selectedQuote.email}</div>
                  <div className="text-xs text-gray-500">Phone: {selectedQuote.phone}</div>
                  <div className="text-xs text-gray-500">Location: {selectedQuote.city}</div>
                </div>

                {/* Equipment items */}
                <div className="space-y-3 border-b border-gray-100 pb-4">
                  <h4 className="font-heading font-bold text-sm text-[#0B1B3D]">Equipment Items ({selectedQuote.equipment_items.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedQuote.equipment_items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-[#0B1B3D]">{item.category}</div>
                          <div className="text-gray-500">Spec: {item.specification || "Not provided"}</div>
                          <div className="text-gray-500">Condition: {item.condition}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#0B1B3D]">Qty: {item.quantity}</div>
                          <div className="text-gray-500">Est. ₹{item.estimated_value.toLocaleString('en-IN')} ea</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-bold text-[#0B1B3D]">Estimated Total Valuation</span>
                    <span className="text-base font-extrabold text-[#10B981]">₹{selectedQuote.estimated_total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* custom msg */}
                {selectedQuote.custom_message && (
                  <div className="space-y-1.5 border-b border-gray-100 pb-4">
                    <h4 className="font-heading font-bold text-sm text-[#0B1B3D]">Special Logistics requests</h4>
                    <p className="text-xs text-gray-600 leading-relaxed bg-yellow-50/50 p-3 rounded border border-yellow-100">{selectedQuote.custom_message}</p>
                  </div>
                )}

                {/* status action controls */}
                <div className="space-y-3">
                  <h4 className="font-heading font-bold text-sm text-[#0B1B3D]">Update Audit Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" className="text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200" onClick={() => handleUpdateStatus(selectedQuote.id, "Pending Evaluation")}>
                      Hold Pending
                    </Button>
                    <Button size="sm" variant="outline" className="text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200" onClick={() => handleUpdateStatus(selectedQuote.id, "Approved")}>
                      Approve Price
                    </Button>
                    <Button size="sm" variant="outline" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200" onClick={() => handleUpdateStatus(selectedQuote.id, "Completed & Paid")}>
                      Close & Pay
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Route Protection wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <RefreshCw className="animate-spin h-8 w-8 text-[#10B981] mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-semibold">ReIT Securing Cryptography Vault...</p>
      </div>
    );
  }

  return user ? children : null;
};

// Top-Level App Component with Context Provider
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkCurrentUser }}>
      <div className="min-h-screen bg-[#F8F9FA] text-[#111827] font-body">
        <BrowserRouter>
          <Header />
          <main className="min-h-[calc(100vh-4rem-24rem)]">
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/about" element={<AboutView />} />
              <Route path="/services" element={<ServicesView />} />
              <Route path="/sell" element={<SellView />} />
              <Route path="/quote" element={<QuoteView />} />
              <Route path="/contact" element={<ContactView />} />
              <Route path="/login" element={<LoginView />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminView />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}
