import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { createHazard } from '../services/hazardService';
import { uploadHazardPhoto } from '../services/storageService';
import { useUserLocation } from '../hooks/useUserLocation';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  AlertCircle,
  CheckCircle,
  Search,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Camera,
  Upload,
  X,
  Clock,
  Shield,
  Send,
  Edit2,
  Check,
  AlertTriangle,
  Info,
  RefreshCw,
  Car
} from 'lucide-react';

const CATEGORIES_LIST = [
  { id: 'Pothole', name: 'Pothole', desc: 'Asphalt crater or crack', icon: '🕳️' },
  { id: 'Waterlogging', name: 'Waterlogging', desc: 'Flooded street or drain block', icon: '🌊' },
  { id: 'Blocked Road', name: 'Blocked Road', desc: 'Barrier, closure or accident', icon: '⛔' },
  { id: 'Road Debris', name: 'Road Debris', desc: 'Broken curb, gravel or debris', icon: '🚧' },
  { id: 'Broken Streetlight', name: 'Broken Streetlight', desc: 'Dark stretch or faulty lamp', icon: '💡' },
  { id: 'Fallen Tree', name: 'Fallen Tree', desc: 'Branch or storm tree damage', icon: '🌳' },
  { id: 'Other', name: 'Other', desc: 'Any other safety obstruction', icon: '⚠️' }
];

export default function ReportHazard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();

  // Location hook: automatically attempts to detect location when permission is granted
  const {
    latitude: userLat,
    longitude: userLng,
    placeName: userPlaceName,
    loading: locLoading,
    manualLoading,
    requestLocation,
    setManualLocation
  } = useUserLocation(true);

  // Flow steps: 0 = Details, 1 = Review, 2 = Confirmation
  const [step, setStep] = useState(0);

  // Form State: Only category is strictly required!
  const [data, setData] = useState({
    category: searchParams.get('category') || '',
    imageUrl: '',
    latitude: null,
    longitude: null,
    address: '',
    severity: 'medium',
    trafficImpact: 'moderate',
    description: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [formError, setFormError] = useState(null);

  // Auto-record submission timestamp
  const [recordedTime] = useState(new Date());

  // Update location in form data whenever GPS detects or manual location is resolved
  useEffect(() => {
    if (userLat && userLng) {
      setData((prev) => ({
        ...prev,
        latitude: userLat,
        longitude: userLng,
        address: userPlaceName || prev.address || `${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E`
      }));
    }
  }, [userLat, userLng, userPlaceName]);

  // Handle Photo selection with local preview
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    setFormError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setData((prev) => ({ ...prev, imageUrl: '' }));
  };

  // Manual location search handler
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setFormError(null);
    try {
      const res = await setManualLocation(manualQuery);
      setData((prev) => ({
        ...prev,
        latitude: res.latitude,
        longitude: res.longitude,
        address: res.placeName
      }));
      setManualQuery('');
      setShowLocationSearch(false);
    } catch (err) {
      setFormError(err.message || 'Could not find that location. Please try a city or street name.');
    }
  };

  // Proceed to Review step
  const handleProceedToReview = (e) => {
    e.preventDefault();
    setFormError(null);

    // Only Category is strictly required!
    if (!data.category || data.category.trim() === '') {
      setFormError('Please select an issue category before proceeding.');
      return;
    }

    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Submit Report to Supabase & Backend
  const handleSubmitReport = async () => {
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setUploadStatus('Preparing hazard report...');

    try {
      let finalPhotoUrl = data.imageUrl || null;

      // 1. Upload photo to Supabase Storage if file is present
      if (selectedFile) {
        setUploadStatus('Uploading photograph to Supabase Storage...');
        try {
          finalPhotoUrl = await uploadHazardPhoto(selectedFile);
        } catch (uploadErr) {
          console.error('Storage upload error:', uploadErr.message);
          throw new Error(`Photo upload failed: ${uploadErr.message}. You can remove the photo and submit without it, or try again.`);
        }
      }

      setUploadStatus('Saving report to Road Reality database...');

      // 2. Submit report payload to backend/database
      const res = await createHazard(
        {
          category: data.category,
          description: data.description ? data.description.trim() : '',
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || (data.latitude ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` : 'General Municipal Area'),
          severity: data.severity || 'medium',
          trafficImpact: data.trafficImpact || 'moderate',
          imageUrl: finalPhotoUrl,
          photo_url: finalPhotoUrl
        },
        session?.access_token
      );

      if (res && res.data) {
        setSubmittedReport(res.data);
        setEmailStatus(res.emailNotification || null);
        setSubmitted(true);
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Database did not confirm receipt of this report.');
      }
    } catch (err) {
      console.error('Report submission error:', err);
      setFormError(err.message || 'Unable to submit report. Please check your connection and try again.');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  // 3. STEP 2: CONFIRMATION SUCCESS SCREEN
  if (submitted) {
    const reportId = submittedReport?.id ? String(submittedReport.id).substring(0, 8) : 'RR-NEW';

    return (
      <main className="page min-h-[85vh] grid place-items-center bg-[#101417] p-4">
        <div className="card max-w-lg w-full p-8 text-center bg-[#191D20] border-[#2E363D] shadow-2xl rounded-3xl animate-in fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <CheckCircle size={36} />
          </div>

          <span className="mt-4 inline-block font-mono text-xs font-bold text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/30 px-3 py-1 rounded-full">
            Report ID: #{reportId}
          </span>

          <h1 className="mt-3 text-3xl font-black text-[#F5F2ED] font-display">Hazard Reported!</h1>

          <p className="mt-2.5 text-[#A8A8A3] text-sm leading-relaxed">
            Thank you for helping keep our roads safe. Your report for <b className="text-[#F5F2ED]">{data.category}</b> has been recorded and is now visible on the live hazard map.
          </p>

          {/* Email Notification Status */}
          <div className="mt-6 p-4 rounded-xl text-xs text-left border border-[#2E363D] bg-[#22272B]">
            {emailStatus?.sent ? (
              <div className="flex items-center gap-2.5 text-[#10B981] font-semibold">
                <Check size={16} className="text-[#10B981] shrink-0" />
                <span>Authority email notification dispatched to <code className="bg-[#101417] px-1.5 py-0.5 rounded text-[#F5F2ED] border border-white/10">{emailStatus.authorityEmail}</code></span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-[#A8A8A3]">
                <Info size={16} className="text-[#F5A623] shrink-0" />
                <span>Report logged to live authority dashboard ({emailStatus?.authorityEmail || 'Roads Authority Desk'}).</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
            <button
              onClick={() => navigate('/my-reports')}
              className="btn btn-accent justify-center text-xs font-extrabold py-3"
            >
              View My Reports
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="btn btn-primary justify-center text-xs font-bold py-3 border-[#2E363D] text-[#F5F2ED] hover:border-[#F5A623]"
            >
              Explore Live Map
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                setSelectedFile(null);
                setPreviewUrl(null);
                setData({
                  category: '',
                  imageUrl: '',
                  latitude: userLat || null,
                  longitude: userLng || null,
                  address: userPlaceName || '',
                  severity: 'medium',
                  trafficImpact: 'moderate',
                  description: ''
                });
              }}
              className="btn btn-secondary justify-center text-xs font-bold py-3"
            >
              Report Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  const reporterDisplayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Community Member';

  return (
    <main className="page bg-[#101417] min-h-screen py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A8A8A3] hover:text-[#F5A623] transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          {/* 3-Step Visual Progress Stepper matching reference */}
          <div className="flex items-center gap-3">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Review' },
              { num: 3, label: 'Submit' }
            ].map((st, i) => {
              const isActive = (step === 0 && i === 0) || (step === 1 && i === 1);
              const isPast = (step === 1 && i === 0) || (step === 2 && i <= 1);
              return (
                <div key={st.num} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-[#F5A623] text-[#101417] shadow-amber-glow'
                        : isPast
                        ? 'bg-[#10B981] text-[#101417]'
                        : 'bg-[#22272B] text-[#A8A8A3] border border-[#2E363D]'
                    }`}
                  >
                    {isPast ? '✓' : st.num}
                  </span>
                  <span className={`font-semibold hidden sm:inline ${isActive ? 'text-[#F5F2ED]' : 'text-[#A8A8A3]'}`}>
                    {st.label}
                  </span>
                  {i < 2 && <span className="text-[#2E363D] mx-0.5">→</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mb-6 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444] flex items-start gap-3 shadow-sm animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Please check the required information:</p>
              <p className="mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 0: DETAILS (Category, Photo, Description, Location, Severity) */}
        {/* ==================================================================== */}
        {step === 0 && (
          <form onSubmit={handleProceedToReview} className="space-y-6">
            <div className="card p-6 md:p-8 bg-[#191D20] border-[#2E363D] shadow-2xl rounded-3xl space-y-6">
              {/* Header */}
              <div className="border-b border-[#2E363D] pb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F5A623] uppercase tracking-wider mb-1">
                  <AlertTriangle size={15} className="stroke-[2.5]" />
                  <span>Report a Hazard</span>
                </div>
                <h1 className="text-2xl font-black text-[#F5F2ED] tracking-tight font-display">
                  Help keep roads safe by reporting an issue
                </h1>
                <p className="text-xs text-[#A8A8A3] mt-1">
                  Only the <span className="font-bold text-[#F5A623]">issue category</span> is required. Location and time are automatically recorded.
                </p>
              </div>

              {/* 1. ISSUE CATEGORY (STRICTLY REQUIRED) - Matching Reference Image */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F5F2ED] uppercase tracking-wider flex items-center gap-1.5">
                    Issue Category <span className="text-[#F5A623]">*</span>
                  </label>
                  <span className="text-[11px] text-[#F5A623] font-bold">Mandatory</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES_LIST.map((cat) => {
                    const isSelected = data.category === cat.name;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setData((prev) => ({ ...prev, category: cat.name }));
                          setFormError(null);
                        }}
                        className={`p-4 rounded-2xl border text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1.5 min-h-[90px] ${
                          isSelected
                            ? 'border-[#F5A623] bg-[#22272B] text-[#F5A623] shadow-amber-glow ring-1 ring-[#F5A623]'
                            : 'border-[#2E363D] bg-[#191D20] hover:bg-[#22272B] text-[#F5F2ED] hover:border-[#F5A623]/40'
                        }`}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="font-extrabold">{cat.name}</span>
                        <span className="text-[10px] text-[#A8A8A3] font-normal leading-tight">
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. DESCRIPTION (OPTIONAL) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#F5F2ED] uppercase tracking-wider flex items-center justify-between">
                  <span>Description (Optional)</span>
                  <span className="text-[11px] text-[#A8A8A3] font-normal">Optional</span>
                </label>
                <textarea
                  rows={3}
                  value={data.description}
                  onChange={(e) => setData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue (e.g. deep pothole in right lane near junction)..."
                  className="input resize-none"
                />
              </div>

              {/* 3. PHOTO UPLOAD & LOCATION CAPTURE CONTROLS (Row Matching Reference Image) */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {/* Photo Upload Box */}
                <div>
                  <label className="block text-xs font-bold text-[#F5F2ED] uppercase tracking-wider mb-2">
                    Add Photo (Optional)
                  </label>
                  {previewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-[#2E363D] h-28 bg-[#101417]">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-2 right-2 rounded-full bg-[#101417]/80 p-1.5 text-white hover:bg-[#EF4444] transition"
                        title="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 rounded-2xl border border-dashed border-[#2E363D] bg-[#191D20] hover:border-[#F5A623]/60 cursor-pointer p-3 transition text-center group">
                      <Camera size={22} className="text-[#F5A623] mb-1 group-hover:scale-110 transition" />
                      <span className="text-xs font-bold text-[#F5F2ED]">Add Photo</span>
                      <span className="text-[10px] text-[#A8A8A3]">JPG, PNG (≤ 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Location Detection & Search Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#F5F2ED] uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={13} className="text-[#F5A623]" /> Location
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLocationSearch(!showLocationSearch)}
                      className="text-[11px] font-bold text-[#F5A623] hover:underline"
                    >
                      {showLocationSearch ? 'Cancel' : 'Edit manually'}
                    </button>
                  </div>

                  {showLocationSearch ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualQuery}
                          onChange={(e) => setManualQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleManualSearch(e);
                            }
                          }}
                          placeholder="City, road or area name..."
                          className="input py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleManualSearch}
                          disabled={manualLoading}
                          className="btn btn-secondary px-3 text-xs"
                        >
                          {manualLoading ? <Loader2 size={14} className="animate-spin" /> : 'Set'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 rounded-2xl border border-[#2E363D] bg-[#191D20] p-3 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#F5F2ED] line-clamp-2">
                            {data.address || (locLoading ? 'Detecting device GPS...' : 'GPS Location detected')}
                          </p>
                          {data.latitude && data.longitude && (
                            <p className="text-[11px] text-[#A8A8A3] font-mono mt-0.5">
                              {data.latitude.toFixed(4)}° N, {data.longitude.toFixed(4)}° E
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={requestLocation}
                          title="Refresh GPS"
                          className="p-1.5 rounded-lg bg-[#22272B] text-[#A8A8A3] hover:text-[#F5A623] transition shrink-0"
                        >
                          <RefreshCw size={14} className={locLoading ? 'animate-spin text-[#F5A623]' : ''} />
                        </button>
                      </div>
                      <span className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Auto-captured
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. SEVERITY & TRAFFIC IMPACT (OPTIONAL) */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#F5F2ED] uppercase tracking-wider mb-2">
                    Severity Level
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'low', label: 'Low', color: 'hover:border-[#10B981]' },
                      { id: 'medium', label: 'Medium', color: 'hover:border-[#F5A623]' },
                      { id: 'high', label: 'High', color: 'hover:border-[#C87942]' },
                      { id: 'critical', label: 'Critical', color: 'hover:border-[#EF4444]' }
                    ].map((sev) => (
                      <button
                        type="button"
                        key={sev.id}
                        onClick={() => setData((prev) => ({ ...prev, severity: sev.id }))}
                        className={`py-2 rounded-xl text-xs font-bold border capitalize transition ${
                          data.severity === sev.id
                            ? 'bg-[#22272B] border-[#F5A623] text-[#F5A623] shadow-xs'
                            : `bg-[#191D20] border-[#2E363D] text-[#A8A8A3] ${sev.color}`
                        }`}
                      >
                        {sev.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F5F2ED] uppercase tracking-wider mb-2">
                    Traffic Impact
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'Normal' },
                      { id: 'moderate', label: 'Slowed' },
                      { id: 'heavy', label: 'Blocked' }
                    ].map((tf) => (
                      <button
                        type="button"
                        key={tf.id}
                        onClick={() => setData((prev) => ({ ...prev, trafficImpact: tf.id }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          data.trafficImpact === tf.id
                            ? 'bg-[#22272B] border-[#F5A623] text-[#F5A623] shadow-xs'
                            : 'bg-[#191D20] border-[#2E363D] text-[#A8A8A3] hover:border-[#F5A623]/40'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-4 border-t border-[#2E363D]">
                <button
                  type="submit"
                  className="btn btn-accent w-full text-sm font-extrabold py-3.5 shadow-amber-glow flex items-center justify-center gap-2"
                >
                  <span>Continue to Review</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ==================================================================== */}
        {/* STEP 1: REVIEW & CONFIRM */}
        {/* ==================================================================== */}
        {step === 1 && (
          <div className="card p-6 md:p-8 bg-[#191D20] border-[#2E363D] shadow-2xl rounded-3xl space-y-6 animate-in fade-in">
            <div className="border-b border-[#2E363D] pb-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#F5A623] uppercase tracking-wider">Step 2: Review</span>
                <h2 className="text-2xl font-black text-[#F5F2ED] font-display mt-0.5">Verify Report Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            </div>

            {/* Review Cards Grid */}
            <div className="space-y-4 text-xs">
              {/* Category & Severity */}
              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider">Issue Category</span>
                  <p className="text-base font-black text-[#F5F2ED] mt-0.5">{data.category}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider">Severity</span>
                  <p className="text-xs font-bold text-[#F5A623] uppercase mt-0.5">{data.severity}</p>
                </div>
              </div>

              {/* Location */}
              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
                <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider">Location</span>
                <p className="text-xs font-bold text-[#F5F2ED] mt-1 flex items-start gap-1.5">
                  <MapPin size={14} className="text-[#F5A623] shrink-0 mt-0.5" />
                  <span>{data.address || 'Location general area (captured)'}</span>
                </p>
                {data.latitude && data.longitude && (
                  <p className="text-[11px] font-mono text-[#A8A8A3] mt-1 pl-5">
                    Coordinates: {data.latitude.toFixed(4)}° N, {data.longitude.toFixed(4)}° E
                  </p>
                )}
              </div>

              {/* Description */}
              {data.description && (
                <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
                  <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider">Description</span>
                  <p className="text-xs text-[#F5F2ED] mt-1 italic leading-relaxed">
                    "{data.description}"
                  </p>
                </div>
              )}

              {/* Photo Preview if uploaded */}
              {previewUrl && (
                <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
                  <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider block mb-2">Attached Photo</span>
                  <img src={previewUrl} alt="Attached hazard" className="h-44 w-full object-cover rounded-xl border border-white/10" />
                </div>
              )}

              {/* Reporter Identity */}
              <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider">Reporter</span>
                  <p className="text-xs font-bold text-[#F5F2ED] mt-0.5">{reporterDisplayName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#A8A8A3] uppercase tracking-wider">Timestamp</span>
                  <p className="text-[11px] font-mono text-[#A8A8A3] mt-0.5">{recordedTime.toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#2E363D] flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                disabled={submitting}
                className="btn btn-secondary flex-1 py-3 text-xs font-bold justify-center"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={submitting}
                className="btn btn-accent flex-1 py-3 text-xs font-extrabold justify-center shadow-amber-glow"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{uploadStatus || 'Submitting Report...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Confirm & Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
