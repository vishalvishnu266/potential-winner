import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';

import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import Button from '../components/Button';
import KeyValueRow from '../components/KeyValueRow';
import { useLocation } from '../composables/useLocation';

/**
 * Map tab — MapLibre GL renders a vector map inside the WebView.
 *
 * Data source
 * -----------
 * We register the `pmtiles://` scheme so MapLibre can read tiles directly
 * from a single .pmtiles archive over HTTPS range requests — no tile
 * server required.  For zero-setup dev, we use the Protomaps demo
 * `20240101.pmtiles` (the whole world at low-mid zoom levels).  Swap the
 * URL below for your own R2/S3-hosted file to make this fully self-hosted.
 *
 * Style
 * -----
 * A minimal inline MapLibre style consuming the Protomaps vector schema
 * (single "protomaps" source layer).  Sufficient for a proof-of-life map;
 * for production you'd import a richer style (protomaps-themes-base) or
 * hand-tune your own.
 */

// Public Protomaps demo file — great for dev, do NOT ship in production.
const PMTILES_URL =
    'https://demo-bucket.protomaps.com/v4.pmtiles';

const STYLE: maplibregl.StyleSpecification = {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
        protomaps: {
            type: 'vector',
            url: `pmtiles://${PMTILES_URL}`,
            attribution:
                '© <a href="https://openstreetmap.org">OpenStreetMap</a> · © <a href="https://protomaps.com">Protomaps</a>',
        },
    },
    layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#f5f6f8' } },
        {
            id: 'earth',
            type: 'fill',
            source: 'protomaps',
            'source-layer': 'earth',
            paint: { 'fill-color': '#ffffff' },
        },
        {
            id: 'water',
            type: 'fill',
            source: 'protomaps',
            'source-layer': 'water',
            paint: { 'fill-color': '#cfe4ff' },
        },
        {
            id: 'landuse-park',
            type: 'fill',
            source: 'protomaps',
            'source-layer': 'landuse',
            filter: ['in', 'kind', 'park', 'forest', 'wood', 'grass'],
            paint: { 'fill-color': '#dff2d4' },
        },
        {
            id: 'roads',
            type: 'line',
            source: 'protomaps',
            'source-layer': 'roads',
            paint: {
                'line-color': '#c8ccd2',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    5, 0.2, 12, 1, 16, 3,
                ],
            },
        },
        {
            id: 'buildings',
            type: 'fill',
            source: 'protomaps',
            'source-layer': 'buildings',
            minzoom: 13,
            paint: { 'fill-color': '#e6e8eb', 'fill-outline-color': '#d0d4d9' },
        },
        {
            id: 'places',
            type: 'symbol',
            source: 'protomaps',
            'source-layer': 'places',
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 12,
            },
            paint: {
                'text-color': '#333',
                'text-halo-color': '#fff',
                'text-halo-width': 1.2,
            },
        },
    ],
};

// Register the pmtiles:// protocol once per JS boot. Doing it at module
// scope means we don't re-register on every mount.
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

export default function MapPage() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const markerRef = useRef<Marker | null>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(2);

    const {
        position, permission, requestPermission, getCurrent,
    } = useLocation();

    // -----------------------------------------------------------------
    // Boot the map once
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!containerRef.current) return;
        try {
            const map = new maplibregl.Map({
                container: containerRef.current,
                style: STYLE,
                center: [0, 20],
                zoom: 2,
                attributionControl: { compact: true },
            });
            map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
            map.on('load', () => setReady(true));
            map.on('zoom', () => setZoom(Number(map.getZoom().toFixed(2))));
            map.on('error', (e: any) => {
                // eslint-disable-next-line no-console
                console.warn('[map]', e?.error?.message || e);
            });
            mapRef.current = map;
        } catch (e: any) {
            setError(e?.message || 'failed to init map');
        }
        return () => {
            markerRef.current?.remove();
            markerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    // -----------------------------------------------------------------
    // Keep marker in sync with GPS
    // -----------------------------------------------------------------
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready || !position) return;
        const { latitude, longitude } = position;
        if (!markerRef.current) {
            markerRef.current = new maplibregl.Marker({ color: '#2563eb' })
                .setLngLat([longitude, latitude])
                .addTo(map);
        } else {
            markerRef.current.setLngLat([longitude, latitude]);
        }
    }, [position, ready]);

    // -----------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------
    async function centerOnMe() {
        if (permission !== 'granted') await requestPermission();
        const p = await getCurrent();
        const map = mapRef.current;
        if (!map || !p) return;
        const { latitude, longitude } = p.coords;
        map.easeTo({ center: [longitude, latitude], zoom: 15, duration: 800 });
    }

    return (
        <div className="min-h-full">
            <PageHeader title="Map" subtitle="MapLibre GL + PMTiles (self-hostable)" />

            <div className="relative mx-5 mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
                <div
                    ref={containerRef}
                    className="h-[420px] w-full"
                    style={{ background: '#f5f6f8' }}
                />
                {!ready && !error && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                        Loading map…
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-red-600">
                        {error}
                    </div>
                )}
            </div>

            <Section>
                <KeyValueRow label="Zoom" value={String(zoom)} />
                <KeyValueRow label="GPS permission" value={permission} />
                {position && (
                    <KeyValueRow
                        label="You are at"
                        value={`${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`}
                    />
                )}
            </Section>

            <div className="mx-5 mb-6 mt-1">
                <Button fullWidth variant="primary" onClick={centerOnMe}>
                    📍 Center on me
                </Button>
            </div>

            <Section>
                <p className="text-xs text-muted">
                    Tiles are streamed from a Protomaps demo <code>.pmtiles</code> file
                    over HTTPS range requests — no tile server involved.
                    Swap <code>PMTILES_URL</code> in <code>MapPage.tsx</code> for your
                    own R2 / S3 / nginx-hosted file to make this fully self-hosted.
                </p>
            </Section>
        </div>
    );
}
