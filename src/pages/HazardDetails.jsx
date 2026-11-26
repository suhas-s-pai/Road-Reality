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
      <main className="page grid place-items-center bg-[#101417] p-4 min-h-screen">
        <div className="text-[#A8A8A3] text-xs font-semibold flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-[#F5A623]" />
          <span>Loading hazard report...</span>
        </div>
      </main>
    );
  }

  if (error || !h) {
    return (
      <main className="page grid place-items-center bg-[#101417] p-4 min-h-screen">
        <div className="card max-w-md w-full p-8 text-center bg-[#191D20] border-[#2E363D] rounded-3xl shadow-2xl">
          <AlertCircle size={36} className="mx-auto text-[#EF4444] mb-3" />
          <h1 className="text-xl font-bold text-[#F5F2ED]">Hazard Not Found</h1>
          <p className="mt-2 text-xs text-[#A8A8A3]">
            {error || 'This hazard report may have been resolved or deleted.'}
          </p>
          <Link to="/explore" className="btn btn-accent mt-5 inline-flex text-xs font-bold py-2 px-5">
            Return to Live Map
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = user && h.user_id && user.id === h.user_id;
  const canDelete = isOwner || isAdmin;
  const canManageStatus = isAdmin;

  return (
    <main className="page bg-[#101417] text-[#F5F2ED] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A8A8A3] hover:text-[#F5A623] transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <span className="text-xs font-mono font-bold text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/30 px-3 py-1 rounded-full">
            #{String(h.id).substring(0, 8)}
          </span>
        </div>

        {/* Status Notification */}
        {statusSuccess && (
          <div className="p-3.5 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs text-[#10B981] flex items-center gap-2 animate-in fade-in font-semibold">
            <Check size={16} />
            <span>{statusSuccess}</span>
          </div>
        )}

        {/* Main Details Card */}
        <div className="card overflow-hidden bg-[#191D20] border-[#2E363D] shadow-2xl rounded-3xl space-y-6">
          {/* Photo Banner if available */}
          {h.imageUrl && (
            <div className="h-64 sm:h-80 w-full overflow-hidden bg-[#101417] relative border-b border-[#2E363D]">
              <img src={h.imageUrl} alt={h.category} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            {/* Title & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E363D] pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#F5F2ED] font-display">
                  {h.category}
                </h1>
                <p className="text-xs text-[#A8A8A3] flex items-center gap-1.5 mt-1.5">
                  <MapPin size={13} className="text-[#F5A623]" />
                  <span>{h.address}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge value={h.status} />
                <Badge value={h.severity} kind="severity" />
              </div>
            </div>

            {/* Description */}
            {h.description && (
              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A8A3] block mb-1">
                  Citizen Description
                </span>
                <p className="text-xs text-[#F5F2ED] italic leading-relaxed">
                  "{h.description}"
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A8A3] block">
                  Submission Details
                </span>
                <p className="font-bold text-[#F5F2ED] mt-1">Reported {ago(h.reportedAt)}</p>
                <p className="text-[11px] text-[#A8A8A3] font-mono mt-0.5">
                  {h.reportedAt ? new Date(h.reportedAt).toLocaleString() : 'N/A'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A8A3] block">
                  Assigned Authority
                </span>
                <p className="font-bold text-[#F5A623] mt-1">{h.assigned_to || 'Unassigned / Pending Dispatch'}</p>
                <p className="text-[11px] text-[#A8A8A3] mt-0.5">Status: {h.status}</p>
              </div>
            </div>

            {/* Interactive Map of Hazard Location */}
            {h.latitude && h.longitude && (
              <div className="rounded-2xl overflow-hidden border border-[#2E363D] h-60">
                <MapView
                  hazards={[h]}
                  center={[h.latitude, h.longitude]}
                />
              </div>
            )}

            {/* Admin Status Controller if authorized */}
            {canManageStatus && (
              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#F5A623]/30 space-y-3">
                <span className="text-xs font-bold text-[#F5A623] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} /> Authority Status Controller
                </span>
                <div className="flex flex-wrap gap-2">
                  {['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={updatingStatus}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        (h.rawStatus || h.status || '').toUpperCase() === st
                          ? 'bg-[#F5A623] text-[#101417]'
                          : 'bg-[#191D20] text-[#A8A8A3] border border-[#2E363D] hover:text-[#F5F2ED]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-[#2E363D] flex items-center justify-between">
              <Link to="/explore" className="btn btn-secondary text-xs py-2 px-4">
                Explore on Map
              </Link>

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-secondary text-xs text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/15 py-2 px-4"
                >
                  <Trash2 size={13} />
                  <span>{deleting ? 'Deleting...' : 'Delete Report'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
