import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { categories } from '../services/mockData';
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
  Camera,
  Upload,
  X,
  Clock,
  Shield,
  Send,
  Edit2,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';

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

  // Flow steps: 0 = Enter Details, 1 = Review & Confirm
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
          console.warn('Storage upload error (proceeding with report):', uploadErr.message);
          // If storage bucket isn't ready, don't fail report creation completely
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
          address: data.address || (data.latitude ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` : 'Location not specified'),
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Database did not confirm receipt of this report.');
      }
    } catch (err) {
      console.error('Report submission error:', err);
      setFormError(err.message || 'Unable to submit report. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  // CONFIRMATION SUCCESS SCREEN
  if (submitted) {
    const reportId = submittedReport?.id ? String(submittedReport.id).substring(0, 8) : 'RR-NEW';

    return (
      <main className="page min-h-[80vh] grid place-items-center bg-slate-50 p-4">
        <div className="card max-w-lg p-8 text-center shadow-xl bg-white border border-slate-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle size={36} />
          </div>

          <span className="mt-3 inline-block font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Report ID: #{reportId}
          </span>

          <h1 className="mt-3 text-3xl font-black text-slate-900">Hazard Reported!</h1>

          <p className="mt-3 text-slate-600 text-sm leading-relaxed">
            Thank you for helping keep our roads safe. Your report for <b className="text-slate-900">{data.category}</b> has been saved to the live road map and is awaiting authority verification.
          </p>

          {/* Email Notification Status */}
          <div className="mt-5 p-3.5 rounded-xl text-xs text-left border bg-slate-50">
            {emailStatus?.sent ? (
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>Authority email notification dispatched to <code className="bg-emerald-100 px-1 py-0.5 rounded">{emailStatus.authorityEmail}</code></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-700">
                <Info size={16} className="text-brand shrink-0" />
                <span>Report logged to live authority monitoring feed ({emailStatus?.authorityEmail || 'Configured Roads Authority'}).</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
            <button
              onClick={() => navigate('/my-reports')}
              className="btn btn-primary justify-center text-sm py-2.5"
            >
              View My Reports
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="btn btn-secondary justify-center text-sm py-2.5"
            >
              Explore Map
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
              className="btn border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 justify-center text-sm py-2.5"
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
    <main className="page bg-slate-50 min-h-screen py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-full">
            {step === 0 ? 'Step 1 of 2: Details' : 'Step 2 of 2: Review'}
          </span>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3 shadow-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Please check the required information:</p>
              <p className="mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        {/* STEP 0: SHORT & SIMPLE REPORT FORM */}
        {step === 0 && (
          <form onSubmit={handleProceedToReview} className="space-y-6">
            <div className="card p-6 md:p-8 bg-white shadow-sm border border-slate-200">
              {/* Header */}
              <div className="border-b pb-4 mb-6">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Report a Road Hazard</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Report potholes, flooding, fallen trees, or road hazards. Only the <span className="font-bold text-brand">category</span> is required.
                </p>
              </div>

              {/* 1. CATEGORY SELECTION (STRICTLY REQUIRED) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Issue Category <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-brand font-semibold">Required</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((cat) => {
                    const isSelected = data.category === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => {
                          setData((prev) => ({ ...prev, category: cat }));
                          setFormError(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left font-bold text-sm transition flex flex-col justify-between min-h-[72px] ${
                          isSelected
                            ? 'border-brand bg-brand/5 text-brand ring-2 ring-brand/20 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center justify-between w-full">
                          <span>{cat}</span>
                          {isSelected && <Check size={16} className="text-brand shrink-0" />}
                        </span>
                        <span className="text-[11px] font-normal text-slate-500 mt-1">
                          {cat === 'Pothole'
                            ? 'Road crater or crack'
                            : cat === 'Waterlogging'
                            ? 'Flooding or standing water'
                            : cat === 'Fallen Tree'
                            ? 'Tree branch or trunk'
                            : cat === 'Broken Streetlight'
                            ? 'Lighting failure'
                            : cat === 'Blocked Road'
                            ? 'Impassable route'
                            : 'Road safety issue'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. AUTOMATIC LOCATION CAPTURE & OPTIONAL MANUAL SELECTION */}
              <div className="mt-8 border-t pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin size={16} className="text-brand" /> Location
                  </label>
                  <span className="text-xs text-slate-500">Auto-detected (Optional)</span>
                </div>

                {/* Location Detection Status Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    {locLoading ? (
                      <Loader2 size={18} className="animate-spin text-brand shrink-0" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {locLoading
                          ? 'Detecting current GPS location...'
                          : data.address || 'Location detected via device GPS'}
                      </p>
                      {data.latitude && data.longitude && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {data.latitude.toFixed(4)}° N, {data.longitude.toFixed(4)}° E
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLocationSearch(!showLocationSearch)}
                      className="text-xs font-bold text-brand hover:underline px-2 py-1"
                    >
                      {showLocationSearch ? 'Close' : 'Change / Search manually'}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestLocation()}
                      title="Refresh GPS"
                      className="btn border border-slate-200 bg-white p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      <MapPin size={14} />
                    </button>
                  </div>
                </div>

                {/* Optional Manual Search Bar */}
                {showLocationSearch && (
                  <div className="p-3 rounded-xl bg-white border border-slate-300 shadow-sm space-y-2">
                    <p className="text-xs text-slate-600 font-medium">Search an address or landmark:</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                          type="text"
                          className="input pl-9 text-xs w-full"
                          placeholder="e.g. MG Road, Bengaluru or Landmark"
                          value={manualQuery}
                          onChange={(e) => setManualQuery(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleManualSearch}
                        disabled={manualLoading || !manualQuery.trim()}
                        className="btn btn-primary text-xs px-3"
                      >
                        {manualLoading ? <Loader2 size={14} className="animate-spin" /> : 'Set Location'}
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Note: Submission will never be blocked if GPS is unavailable.
                </p>
              </div>

              {/* 3. PHOTOGRAPH (OPTIONAL) */}
              <div className="mt-8 border-t pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera size={16} className="text-brand" /> Photograph
                  </label>
                  <span className="text-xs text-slate-500">Optional</span>
                </div>

                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 max-h-64 bg-slate-900 group">
                    <img src={previewUrl} alt="Hazard preview" className="w-full h-56 object-cover" />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition shadow"
                      title="Remove photograph"
                    >
                      <X size={16} />
                    </button>
                    <span className="absolute bottom-2 left-2 text-[11px] bg-black/60 text-white px-2 py-0.5 rounded font-mono">
                      {selectedFile?.name || 'Attached photo'}
                    </span>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-brand/50 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center">
                    <Upload size={24} className="text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">Tap to upload a photo or take picture</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 5MB (Optional)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 4. SEVERITY & TRAFFIC IMPACT (OPTIONAL) */}
              <div className="mt-8 border-t pt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Severity */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Severity Level (Optional)</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'low', label: 'Low', color: 'hover:border-emerald-500 active:bg-emerald-50' },
                        { id: 'medium', label: 'Med', color: 'hover:border-amber-500 active:bg-amber-50' },
                        { id: 'high', label: 'High', color: 'hover:border-orange-500 active:bg-orange-50' },
                        { id: 'critical', label: 'Crit', color: 'hover:border-red-500 active:bg-red-50' }
                      ].map((sev) => (
                        <button
                          type="button"
                          key={sev.id}
                          onClick={() => setData((prev) => ({ ...prev, severity: sev.id }))}
                          className={`py-2 text-xs font-bold rounded-lg border text-center transition ${
                            data.severity === sev.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {sev.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Traffic Impact */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Traffic Impact (Optional)</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'none', label: 'Clear' },
                        { id: 'moderate', label: 'Partial' },
                        { id: 'blocked', label: 'Blocked' }
                      ].map((ti) => (
                        <button
                          type="button"
                          key={ti.id}
                          onClick={() => setData((prev) => ({ ...prev, trafficImpact: ti.id }))}
                          className={`py-2 text-xs font-bold rounded-lg border text-center transition ${
                            data.trafficImpact === ti.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {ti.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description (Optional) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="input w-full text-xs"
                    placeholder="Add any helpful details or landmark references..."
                    value={data.description}
                    onChange={(e) => setData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* 5. AUTOMATIC SUBMISSION TIMESTAMP & REPORTER IDENTITY */}
              <div className="mt-6 border-t pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  Time recorded automatically: <b className="text-slate-700">{recordedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
                </span>

                <span className="flex items-center gap-1.5">
                  <Shield size={14} className="text-brand" />
                  Reporting as: <b className="text-slate-700">{reporterDisplayName}</b>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 border-t pt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs py-2.5 px-4"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary text-sm py-2.5 px-6 font-bold flex items-center gap-2"
                >
                  Review Report →
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 1: REVIEW & SUBMIT SCREEN */}
        {step === 1 && (
          <div className="card p-6 md:p-8 bg-white shadow-sm border border-slate-200 space-y-6">
            <div className="border-b pb-4">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">Verification Step</span>
              <h1 className="text-2xl font-black text-slate-900 mt-1">Review Your Report</h1>
              <p className="text-sm text-slate-600">
                Please check the details below. Click Submit Report to save your report to the live database.
              </p>
            </div>

            {/* Review Summary Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Hazard Category</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{data.category}</p>
                </div>
                <span className="px-3 py-1 bg-brand text-white font-bold text-xs rounded-full">
                  {data.severity.toUpperCase()}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Location</p>
                  <p className="font-semibold text-slate-800 mt-0.5 flex items-start gap-1">
                    <MapPin size={15} className="text-brand shrink-0 mt-0.5" />
                    <span>{data.address || 'Location coordinates detected via device'}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Traffic Impact</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.trafficImpact === 'blocked'
                      ? '🚨 Road Blocked'
                      : data.trafficImpact === 'moderate'
                      ? '⚠️ Partial Delay'
                      : '✅ Normal Flow'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Recorded Date & Time</p>
                  <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Clock size={15} className="text-slate-500" />
                    {recordedTime.toLocaleDateString()} at {recordedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Reporter Identity</p>
                  <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Shield size={15} className="text-brand" />
                    {reporterDisplayName}
                  </p>
                  <p className="text-[11px] text-slate-500 italic">Personal details restricted to verified administrators.</p>
                </div>
              </div>

              {/* Description preview */}
              {data.description && (
                <div className="border-t pt-3 text-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold">Description</p>
                  <p className="text-slate-700 mt-1 italic bg-white p-3 rounded-lg border border-slate-200">
                    "{data.description}"
                  </p>
                </div>
              )}

              {/* Photograph preview */}
              {previewUrl && (
                <div className="border-t pt-3">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Attached Photograph</p>
                  <img src={previewUrl} alt="Attached hazard" className="h-44 rounded-xl object-cover border" />
                </div>
              )}
            </div>

            {/* Submission Status Message */}
            {uploadStatus && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
                <span className="font-semibold">{uploadStatus}</span>
              </div>
            )}

            {/* Bottom Review Actions */}
            <div className="flex items-center justify-between border-t pt-5">
              <button
                type="button"
                onClick={() => setStep(0)}
                disabled={submitting}
                className="btn border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs py-2.5 px-4 flex items-center gap-1.5"
              >
                <Edit2 size={14} /> Edit Details
              </button>

              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={submitting}
                className="btn btn-primary text-sm py-2.5 px-8 font-bold flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Report
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
