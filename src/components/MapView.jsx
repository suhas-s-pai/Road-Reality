import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from './Badges';
import { ago } from '../utils/formatters';
import { MapPin, AlertTriangle, ArrowRight } from 'lucide-react';

const categoryColors = {
  Pothole: '#F5A623', // Warm amber
  Waterlogging: '#06B6D4', // Cyan
  'Fallen Tree': '#10B981', // Emerald
  'Road Debris': '#C87942', // Copper
  'Broken Streetlight': '#E8C18A', // Champagne
  'Blocked Road': '#EF4444', // Red
  Accident: '#EF4444',
  Other: '#F5A623'
};

const categoryIcons = {
  Pothole: '🕳️',
  Waterlogging: '🌊',
  'Fallen Tree': '🌳',
  'Road Debris': '🚧',
  'Broken Streetlight': '💡',
  'Blocked Road': '⛔',
  Accident: '🚨',
  Other: '⚠️'
};

// Hazard marker custom glowing icon
const createHazardIcon = (category, status, severity) => {
  const isResolved = (status || '').toUpperCase() === 'RESOLVED';
  const color = isResolved ? '#10B981' : (categoryColors[category] || '#F5A623');
  const icon = categoryIcons[category] || '⚠️';

  return L.divIcon({
    className: 'custom-hazard-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #191D20;
        border: 2px solid ${color};
        box-shadow: 0 0 14px ${color}80, 0 4px 10px rgba(0,0,0,0.6);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span style="font-size: 14px; line-height: 1;">${icon}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

// User location custom glowing icon
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(245, 166, 35, 0.3); animation: pulse-ring 2s infinite ease-in-out;"></div>
      <div style="width: 14px; height: 14px; border-radius: 50%; background: #F5A623; border: 2.5px solid #101417; box-shadow: 0 0 12px #F5A623;"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Component to re-center map when location changes
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function MapView({ hazards = [], userLocation = null, center = null, onSelectHazard }) {
  const defaultCenter = [12.9716, 77.5946];
  let initialCenter = defaultCenter;

  if (userLocation && userLocation.latitude && userLocation.longitude) {
    initialCenter = [userLocation.latitude, userLocation.longitude];
  } else if (center) {
    initialCenter = center;
  } else if (hazards.length > 0 && hazards[0].latitude && hazards[0].longitude) {
    initialCenter = [hazards[0].latitude, hazards[0].longitude];
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full rounded-2xl bg-[#101417]"
    >
      {/* CartoDB Dark Matter Cinematic Map Tiles */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapRecenter center={initialCenter} />

      {/* User Current / Selected GPS Marker */}
      {userLocation && userLocation.latitude && userLocation.longitude && (
        <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
          <Popup>
            <div className="p-3 text-center min-w-44 bg-[#22272B] text-[#F5F2ED] rounded-xl">
              <span className="text-[11px] font-bold text-[#F5A623] uppercase tracking-wider block">
                📍 {userLocation.isManual ? 'Selected Area' : 'Your GPS Location'}
              </span>
              <p className="text-xs font-bold mt-1 text-[#F5F2ED]">
                {userLocation.placeName || `${userLocation.latitude.toFixed(4)}°, ${userLocation.longitude.toFixed(4)}°`}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Real Supabase Hazard Markers */}
      {hazards.map((h) => {
        if (!h.latitude || !h.longitude || isNaN(h.latitude) || isNaN(h.longitude)) return null;

        const icon = createHazardIcon(h.category, h.status, h.severity);

        return (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectHazard && onSelectHazard(h)
            }}
          >
            <Popup>
              <div className="p-3.5 min-w-56 bg-[#22272B] text-[#F5F2ED] rounded-2xl border border-[#2E363D] space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-[#2E363D] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#F5F2ED]">
                    <span>{categoryIcons[h.category] || '⚠️'}</span>
                    <span>{h.category}</span>
                  </div>
                  <Badge value={h.status} />
                </div>

                <p className="text-xs text-[#A8A8A3] flex items-start gap-1 line-clamp-2">
                  <MapPin size={13} className="text-[#F5A623] shrink-0 mt-0.5" />
                  <span>{h.address || `${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}`}</span>
                </p>

                {h.description && (
                  <p className="text-[11px] text-[#A8A8A3] italic line-clamp-2">
                    "{h.description}"
                  </p>
                )}

                <div className="pt-2 border-t border-[#2E363D] flex items-center justify-between">
                  <span className="text-[10px] text-[#A8A8A3]">{ago(h.reportedAt)}</span>
                  <Link
                    to={`/hazards/${h.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F5A623] hover:underline"
                  >
                    <span>View Details</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
