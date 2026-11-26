import { useEffect, useState } from 'react';
import { Filter, LocateFixed, Plus, Search, AlertCircle, Loader2, MapPin, RefreshCw, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapView from '../components/MapView';
import HazardCard from '../components/HazardCard';
import { Badge } from '../components/Badges';
import { getHazards, getNearbyHazards } from '../services/hazardService';
import { categories } from '../services/mockData';
import { useUserLocation } from '../hooks/useUserLocation';
import { ago } from '../utils/formatters';

export default function Explore() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualError, setManualError] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);

  const {
    location: userLocation,
    latitude,
    longitude,
    placeName,
    loading: locLoading,
    manualLoading,
    requestLocation,
    setManualLocation
  } = useUserLocation(true);

  const loadHazards = async (lat = null, lng = null) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let res;
      if (lat && lng) {
        res = await getNearbyHazards(lat, lng, 50);
      } else {
        res = await getHazards();
      }
      const dataList = res.data || [];
      setItems(dataList);
      if (dataList.length > 0 && !selectedHazard) {
        setSelectedHazard(dataList[0]);
      }
    } catch (err) {
      console.error('Failed to load hazards:', err);
      setErrorMessage('Road Reality database unavailable. Please check connection.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      loadHazards(latitude, longitude);
    } else {
      loadHazards();
    }
  }, [latitude, longitude]);

  const handleLocateMe = () => {
    requestLocation();
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setManualError(null);
    try {
      await setManualLocation(manualInput);
      setShowLocationModal(false);
      setManualInput('');
    } catch (err) {
      setManualError(err.message || "Could not find that location. Please try another city or address.");
    }
  };

  const filteredItems = items.filter((x) => {
    const matchesStatus =
      filter === 'all' ||
      (x.status && x.status.toLowerCase() === filter.toLowerCase()) ||
      (x.rawStatus && x.rawStatus.toLowerCase() === filter.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      (x.category && x.category.toLowerCase() === categoryFilter.toLowerCase()) ||
      (x.hazard_type && x.hazard_type.toLowerCase() === categoryFilter.toLowerCase());

    const matchesSearch =
      searchQuery === '' ||
      (x.category && x.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (x.address && x.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (x.description && x.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <main className="page relative bg-[#101417] text-[#F5F2ED] min-h-[calc(100vh-64px)]">
      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[380px_1fr]">
        {/* Left Sidebar Directory */}
        <aside className="order-2 lg:order-1 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider block">Real-time Map</span>
              <h1 className="text-xl font-black text-[#F5F2ED] font-display">Explore Live Hazards</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadHazards(latitude, longitude)}
                disabled={loading}
                className="p-1.5 text-[#A8A8A3] hover:text-[#F5A623] hover:bg-[#191D20] rounded-xl border border-[#2E363D] transition"
                title="Refresh live reports"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin text-[#F5A623]' : ''} />
              </button>
              {placeName && (
                <span className="text-[11px] font-bold text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/30 px-2.5 py-1 rounded-full flex items-center gap-1 truncate max-w-[140px]">
                  <MapPin size={11} className="shrink-0" /> {placeName}
                </span>
              )}
            </div>
          </div>

          {/* Search & Location Bar */}
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search hazards</span>
              <Search className="absolute left-3 top-2.5 text-[#A8A8A3]" size={16} />
              <input
                className="input pl-9 text-xs py-2 bg-[#191D20] border-[#2E363D]"
                placeholder="Search category, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>

            <button
              onClick={handleLocateMe}
              disabled={locLoading}
              className="btn btn-secondary flex items-center justify-center min-w-[40px] px-2.5 py-2 border-[#2E363D]"
              title="Use GPS location"
            >
              <LocateFixed size={16} className={locLoading ? 'animate-spin text-[#F5A623]' : 'text-[#A8A8A3]'} />
            </button>
            <button
              onClick={() => setShowLocationModal(!showLocationModal)}
              className="btn btn-secondary text-xs font-bold px-3 py-2 border-[#2E363D] text-[#F5F2ED]"
              title="Set location manually"
            >
              Set Area
            </button>
          </div>

          {/* Manual Location Input Form */}
          {showLocationModal && (
            <div className="card p-3 border-[#F5A623]/30 bg-[#191D20] animate-in fade-in">
              <form onSubmit={handleManualSearch} className="flex gap-2">
                <input
                  className="input py-1.5 px-3 text-xs flex-1 bg-[#101417] border-[#2E363D]"
                  placeholder="Enter city or area name..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="btn btn-accent text-xs py-1.5 px-3"
                >
                  {manualLoading ? <Loader2 size={13} className="animate-spin" /> : 'Set'}
                </button>
              </form>
              {manualError && <p className="mt-1.5 text-xs text-[#EF4444] font-medium">{manualError}</p>}
            </div>
          )}

          {/* Filters Bar: Status & Category */}
          <div className="grid grid-cols-2 gap-2">
            {/* Status Filter */}
            <div className="flex gap-1.5 items-center">
              <select
                className="input text-xs font-semibold py-1.5 px-2 bg-[#191D20] border-[#2E363D]"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="reported">Reported (New)</option>
                <option value="verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                className="input text-xs font-semibold py-1.5 px-2 w-full bg-[#191D20] border-[#2E363D]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Count Header */}
          <div className="flex items-center justify-between text-xs font-bold text-[#A8A8A3] pt-1">
            <span>
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-[#F5A623]" /> Loading reports...
                </span>
              ) : (
                `${filteredItems.length} active report${filteredItems.length === 1 ? '' : 's'}`
              )}
            </span>
            <span className="text-[11px] text-[#A8A8A3]">Click marker to inspect</span>
          </div>

          {/* Hazard List */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#191D20] border border-[#2E363D]" />
              ))
            ) : filteredItems.length === 0 ? (
              <div className="card p-6 text-center text-[#A8A8A3] text-xs bg-[#191D20] border-[#2E363D] rounded-2xl">
                <p className="font-bold text-[#F5F2ED] text-sm">No hazard reports found</p>
                <p className="text-xs text-[#A8A8A3] mt-1">Try clearing filters or search location.</p>
                <Link to="/report" className="btn btn-accent text-xs mt-3.5 inline-flex font-bold">
                  Report a Hazard
                </Link>
              </div>
            ) : (
              filteredItems.map((h) => (
                <div
                  key={h.id}
                  onClick={() => setSelectedHazard(h)}
                  className={`cursor-pointer transition ${selectedHazard?.id === h.id ? 'ring-2 ring-[#F5A623] rounded-2xl' : ''}`}
                >
                  <HazardCard hazard={h} />
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Map View Area */}
        <section className="order-1 h-[55vh] overflow-hidden rounded-3xl border border-[#2E363D] bg-[#101417] lg:order-2 lg:h-[calc(100vh-100px)] relative shadow-2xl">
          <MapView
            hazards={filteredItems}
            userLocation={userLocation}
            onSelectHazard={(h) => setSelectedHazard(h)}
          />

          {/* Floating Selected Hazard Card (Matching Reference Image 03 EXPLORE LIVE MAP) */}
          {selectedHazard && (
            <div className="absolute bottom-5 left-4 right-4 sm:left-6 sm:max-w-md z-[800] rounded-2xl border border-[#2E363D] bg-[#191D20]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate">
                {selectedHazard.imageUrl ? (
                  <img
                    src={selectedHazard.imageUrl}
                    alt={selectedHazard.category}
                    className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#22272B] text-xl border border-[#2E363D] shrink-0">
                    ⚠️
                  </div>
                )}
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-[#F5F2ED] truncate">{selectedHazard.category}</p>
                    <Badge value={selectedHazard.status} />
                  </div>
                  <p className="text-[11px] text-[#A8A8A3] truncate mt-0.5">{selectedHazard.address}</p>
                  <p className="text-[10px] text-[#A8A8A3] font-mono">{ago(selectedHazard.reportedAt)}</p>
                </div>
              </div>

              <Link
                to={`/hazards/${selectedHazard.id}`}
                className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5A623] text-[#101417] hover:brightness-110 transition shrink-0 shadow-amber-glow"
                title="View full details"
              >
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button */}
      <Link
        to="/report"
        className="btn btn-accent fixed bottom-5 right-5 z-[900] shadow-amber-glow flex items-center gap-2 px-5 py-3 rounded-full text-xs font-extrabold"
      >
        <Plus size={16} className="stroke-[3]" />
        <span>Report Hazard</span>
      </Link>
    </main>
  );
}
