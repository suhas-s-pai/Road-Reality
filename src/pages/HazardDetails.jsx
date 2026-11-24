import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MapPin, Car, Flag, AlertCircle, ArrowLeft, Trash2, Loader2, Shield, User, Clock, Check } from 'lucide-react';
import { getHazardById, deleteHazard, updateHazardStatus } from '../services/hazardService';
import { Badge } from '../components/Badges';
import { ago } from '../utils/formatters';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';

export default function HazardDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session, isAdmin } = useAuth();

  const [h, setH] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getHazardById(id, session?.access_token)
      .then((x) => {
        setH(x.data);
      })
      .catch((err) => {
        console.error('Error fetching hazard details:', err);
        setError('Hazard report not found or server is unavailable.');
      })
      .finally(() => setLoading(false));
  }, [id, session]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    setStatusSuccess(null);
    try {
      const res = await updateHazardStatus(id, newStatus, session?.access_token);
      setH(res.data);
      setStatusSuccess(`Status updated to ${newStatus}`);
      setTimeout(() => setStatusSuccess(null), 3500);
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this hazard report?')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteHazard(id, session?.access_token);
      alert('Hazard report deleted successfully.');
      navigate('/my-reports');
    } catch (err) {
      alert(err.message || 'Failed to delete report.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="page grid place-items-center bg-surface p-4">
        <div className="text-slate-600 text-sm font-semibold flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Loading hazard report...
        </div>
      </main>
    );
  }

  if (error || !h) {
    return (
      <main className="page grid place-items-center bg-surface p-4">
        <div className="card max-w-md p-8 text-center shadow-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Report Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">{error || 'Unable to display details for this hazard report.'}</p>
          <Link to="/explore" className="btn btn-primary mt-6 inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = Boolean(user && h.user_id && user.id === h.user_id);
  const canDelete = isOwner || isAdmin;

  return (
    <main className="page bg-surface">
      <div className="mx-auto max-w-5xl gap-6 p-4 py-8">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft size={14} /> Back to Explore
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <section className="card overflow-hidden shadow-sm">
            {h.imageUrl ? (
              <img className="h-80 w-full object-cover" src={h.imageUrl} alt={`${h.category} at ${h.address}`} />
            ) : (
              <div className="h-48 w-full bg-slate-100 grid place-items-center text-slate-400 font-bold">
                No Photograph Attached
              </div>
            )}
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="mr-auto text-3xl font-black text-slate-900">{h.category}</h1>
                <Badge value={h.severity} kind="severity" />
                <Badge value={h.status} />
              </div>

              <p className="mt-4 flex gap-2 text-slate-700 font-medium">
                <MapPin size={19} className="text-brand shrink-0 mt-0.5" />
                {h.address}
              </p>

              <div className="mt-4 leading-7 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                {h.description || 'No detailed description provided.'}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-y py-4 text-sm">
                <div>
                  <b className="text-slate-900">Traffic impact</b>
                  <p className="mt-1 flex items-center gap-1.5 text-slate-600">
                    <Car size={16} />
                    {h.trafficImpact === 'yes'
                      ? 'Traffic affected'
                      : h.trafficImpact === 'partial'
                      ? 'Partially affected'
                      : 'Not affected'}
                  </p>
                </div>
                <div>
                  <b className="text-slate-900">Reported</b>
                  <p className="mt-1 text-slate-600">{ago(h.reportedAt)}</p>
                </div>
              </div>

              <h2 className="mt-6 text-lg font-bold text-slate-900">Activity timeline</h2>
              <ol className="mt-3 space-y-4 border-l-2 border-slate-200 pl-5 text-sm">
                <li>
                  <b className="text-slate-900">Report submitted</b>
                  <p className="text-slate-500">{new Date(h.reportedAt).toLocaleString()}</p>
                </li>
                <li>
                  <b className="text-slate-900">{h.verificationStatus}</b>
                  <p className="text-slate-500">Last updated {ago(h.updatedAt)}</p>
                </li>
              </ol>

              {/* Reporter Identity (Restricted Details) */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reporter Information</h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-slate-700 font-bold text-xs">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{h.reporter?.name || 'Community Member'}</p>
                    {h.reporter?.email ? (
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <span>{h.reporter.email}</span>
                        {isAdmin && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">Admin View</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Personal email protected</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Administrator Status Update Action */}
              {isAdmin && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <Shield size={14} /> Authority Actions
                    </span>
                    {statusSuccess && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Check size={14} /> {statusSuccess}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Set Status:</span>
                    {['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                      <button
                        key={st}
                        disabled={updatingStatus || (h.rawStatus || '').toUpperCase() === st}
                        onClick={() => handleStatusChange(st)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                          (h.rawStatus || '').toUpperCase() === st
                            ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100/50'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner / Admin Management Options */}
              {canDelete && (
                <div className="mt-8 border-t pt-5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <Shield size={13} /> Administrator Action
                      </span>
                    ) : (
                      'You submitted this report'
                    )}
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn btn-secondary text-red-600 hover:bg-red-50 text-xs flex items-center gap-1.5"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? 'Deleting report...' : 'Delete Report'}
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="card p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Location Map</h2>
              <div className="mt-3 h-56 overflow-hidden rounded-xl border">
                <MapView hazards={[h]} center={[h.latitude, h.longitude]} />
              </div>
              <Link to="/explore" className="btn btn-secondary mt-3 w-full justify-center">
                View on main map
              </Link>
            </div>
            <button
              onClick={() => alert('Thank you. Incorrect information flag submitted for review.')}
              className="btn btn-secondary w-full justify-center text-xs"
            >
              <Flag size={16} />
              Report incorrect information
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
