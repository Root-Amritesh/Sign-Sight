import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  Group,
  Vector3,
  Color,
  Raycaster,
  Vector2,
  CanvasTexture,
  RingGeometry,
  CatmullRomCurve3,
  TubeGeometry,
  DoubleSide,
} from 'three';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import worldData from '../../data/world-110m.json';
import type { Alert, Severity } from '../../types/api';
import type { GeoNode } from './MapFlat';

interface ThreatGlobe3DProps {
  geoNodes: GeoNode[];
  filteredAlerts: Alert[];
  selectedNode: GeoNode | null;
  onSelectNode: (node: GeoNode) => void;
  selectedCountry: string | null;
  onSelectCountry: (countryName: string | null) => void;
  isRotating: boolean;
  onToggleRotating: () => void;
  onWebGLError?: () => void;
}

interface CountryFeature {
  type: 'Feature';
  id: string;
  properties?: { name?: string };
  geometry: d3.GeoGeometryObjects;
}

export const ThreatGlobe3D: React.FC<ThreatGlobe3DProps> = ({
  geoNodes,
  filteredAlerts,
  onSelectNode,
  selectedCountry,
  onSelectCountry,
  isRotating,
  onWebGLError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GeoNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // References for animation and interaction
  const globeGroupRef = useRef<Group | null>(null);
  const rotationAngleRef = useRef<number>(0);
  const tiltAngleRef = useRef<number>(0.2);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const textureRef = useRef<CanvasTexture | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const pulseRingsRef = useRef<Mesh[]>([]);
  const arcsGroupRef = useRef<Group | null>(null);
  const nodesGroupRef = useRef<Group | null>(null);

  // Extract world countries GeoJSON
  const countries = useMemo(() => {
    const featureColl = topojson.feature(
      worldData as unknown as Parameters<typeof topojson.feature>[0],
      worldData.objects.countries as unknown as Parameters<typeof topojson.feature>[1]
    ) as unknown as { features: CountryFeature[] };
    return featureColl.features;
  }, []);

  // Map country names to alert counts and top severity
  const countryStats = useMemo(() => {
    const stats: Record<string, { count: number; maxSeverity: Severity; alerts: Alert[] }> = {};

    filteredAlerts.forEach((alert) => {
      const matchedCountry = 'Unknown Territory';
      if (!stats[matchedCountry]) {
        stats[matchedCountry] = { count: 0, maxSeverity: alert.severity, alerts: [] };
      }
      stats[matchedCountry].count += 1;
      stats[matchedCountry].alerts.push(alert);
      if (alert.severity === 'critical') stats[matchedCountry].maxSeverity = 'critical';
      else if (alert.severity === 'high' && stats[matchedCountry].maxSeverity !== 'critical') {
        stats[matchedCountry].maxSeverity = 'high';
      }
    });

    return stats;
  }, [filteredAlerts]);

  // Helper to convert lat/lng to 3D Vector3
  const latLngToVector3 = useCallback((lat: number, lng: number, radius: number): Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new Vector3(x, y, z);
  }, []);

  // Redraw the equirectangular map canvas texture
  const updateMapCanvas = useCallback(
    (highlightCountry: string | null) => {
      const canvas = offscreenCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Projection mapping [width, height]
      const projection = d3.geoEquirectangular().fitSize([width, height], { type: 'Sphere' } as d3.GeoGeometryObjects);
      const pathGenerator = d3.geoPath().projection(projection).context(ctx);

      // Deep space ocean background
      ctx.fillStyle = '#0A0B0C';
      ctx.fillRect(0, 0, width, height);

      // Subtle graticule grid
      ctx.strokeStyle = '#181C1E';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const graticule = d3.geoGraticule();
      pathGenerator(graticule());
      ctx.stroke();

      // Render countries
      countries.forEach((feature) => {
        const countryName = feature.properties?.name;
        const isTarget = countryName && (countryName === highlightCountry || countryName === selectedCountry);

        ctx.beginPath();
        pathGenerator(feature as unknown as d3.GeoPermissibleObjects);

        if (isTarget) {
          ctx.fillStyle = 'rgba(182, 255, 59, 0.14)';
          ctx.fill();
          ctx.strokeStyle = '#B6FF3B';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#101214';
          ctx.fill();
          ctx.strokeStyle = '#23282B';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    },
    [countries, selectedCountry]
  );

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        if (onWebGLError) onWebGLError();
        return;
      }
    } catch {
      if (onWebGLError) onWebGLError();
      return;
    }

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.3);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const globeGroup = new Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const R = 1.6;

    // Offscreen Canvas for dynamic high-res texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    offscreenCanvasRef.current = canvas;

    const texture = new CanvasTexture(canvas);
    textureRef.current = texture;

    // Initial draw of countries texture
    updateMapCanvas(hoveredCountry);

    // Globe Sphere Mesh
    const sphereGeo = new SphereGeometry(R, 64, 64);
    const sphereMat = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
    });
    const globeMesh = new Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // Subtle atmospheric rim ring
    const rimGeo = new RingGeometry(R * 0.999, R * 1.015, 64);
    const rimMat = new MeshBasicMaterial({
      color: new Color('#23282B'),
      side: DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const rimMesh = new Mesh(rimGeo, rimMat);
    rimMesh.position.z = -0.05;
    scene.add(rimMesh);

    // Groups for dynamic elements
    const nodesGroup = new Group();
    globeGroup.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    const arcsGroup = new Group();
    globeGroup.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    // Resize Handler
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let pulseTime = 0;
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);

      if (globeGroupRef.current) {
        if (isRotating && !isDraggingRef.current) {
          rotationAngleRef.current += 0.0018;
        }
        globeGroupRef.current.rotation.y = rotationAngleRef.current;
        globeGroupRef.current.rotation.x = tiltAngleRef.current;
      }

      // Animate pulse rings
      pulseTime += 0.03;
      pulseRingsRef.current.forEach((ringMesh, idx) => {
        const cycle = (pulseTime + idx * 0.4) % 1.5;
        const scale = 1 + cycle * 1.6;
        ringMesh.scale.set(scale, scale, 1);
        const mat = ringMesh.material as MeshBasicMaterial;
        if (mat) {
          mat.opacity = Math.max(0, 1 - cycle / 1.5);
        }
      });

      renderer.render(scene, camera);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      if (container) container.innerHTML = '';
    };
  }, [updateMapCanvas, onWebGLError, isRotating]);

  // Update map canvas whenever hovered or selected country changes
  useEffect(() => {
    updateMapCanvas(hoveredCountry || selectedCountry);
  }, [hoveredCountry, selectedCountry, updateMapCanvas]);

  // Build 3D Attack Points and Ballistic Arcs
  useEffect(() => {
    if (!nodesGroupRef.current || !arcsGroupRef.current) return;

    const nodesGroup = nodesGroupRef.current;
    const arcsGroup = arcsGroupRef.current;

    // Clear existing
    while (nodesGroup.children.length > 0) {
      nodesGroup.remove(nodesGroup.children[0]);
    }
    while (arcsGroup.children.length > 0) {
      arcsGroup.remove(arcsGroup.children[0]);
    }
    pulseRingsRef.current = [];

    const R = 1.6;
    const severityColors: Record<Severity, string> = {
      critical: '#FF3B30',
      high: '#FF9500',
      medium: '#FFCC00',
      low: '#007AFF',
      info: '#8E8E93',
    };

    // 1. Draw attack nodes
    geoNodes.forEach((node) => {
      const [lng, lat] = node.coordinates;
      const pos = latLngToVector3(lat, lng, R * 1.002);
      const colorHex = severityColors[node.maxSeverity] || '#B6FF3B';
      const nodeRadius = Math.min(0.038, Math.max(0.016, 0.012 + node.count * 0.004));

      // Core sphere dot
      const dotGeo = new SphereGeometry(nodeRadius, 16, 16);
      const dotMat = new MeshBasicMaterial({ color: new Color(colorHex) });
      const dotMesh = new Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      dotMesh.userData = { node };
      nodesGroup.add(dotMesh);

      // Pulse ring on sphere tangent plane
      const ringGeo = new RingGeometry(nodeRadius * 1.2, nodeRadius * 1.6, 24);
      const ringMat = new MeshBasicMaterial({
        color: new Color(colorHex),
        side: DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos.clone().multiplyScalar(1.002));
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      nodesGroup.add(ringMesh);
      pulseRingsRef.current.push(ringMesh);
    });

    // 2. Draw arcs between nodes if multiple nodes exist
    if (geoNodes.length >= 2) {
      geoNodes.slice(0, 10).forEach((node, i) => {
        const nextNode = geoNodes[(i + 1) % geoNodes.length];
        const [lng1, lat1] = node.coordinates;
        const [lng2, lat2] = nextNode.coordinates;

        const p1 = latLngToVector3(lat1, lng1, R * 1.002);
        const p2 = latLngToVector3(lat2, lng2, R * 1.002);
        const dist = p1.distanceTo(p2);

        if (dist > 0.15) {
          const mid = p1.clone().add(p2).multiplyScalar(0.5);
          const arcAltitude = R + Math.min(0.6, Math.max(0.12, dist * 0.22));
          mid.normalize().multiplyScalar(arcAltitude);

          const curve = new CatmullRomCurve3([p1, mid, p2]);
          const tubeGeo = new TubeGeometry(curve, 32, 0.0035, 6, false);
          const colorHex = severityColors[node.maxSeverity] || '#B6FF3B';
          const tubeMat = new MeshBasicMaterial({
            color: new Color(colorHex),
            transparent: true,
            opacity: 0.65,
          });
          const arcMesh = new Mesh(tubeGeo, tubeMat);
          arcsGroup.add(arcMesh);
        }
      });
    }
  }, [geoNodes, filteredAlerts, latLngToVector3]);

  // Pointer event handlers for rotation and country hover/click
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current || !globeGroupRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      rotationAngleRef.current += deltaX * 0.005;
      tiltAngleRef.current = Math.max(-1.1, Math.min(1.1, tiltAngleRef.current + deltaY * 0.005));

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Raycast to detect hovered node or country
    const ndcX = (mouseX / rect.width) * 2 - 1;
    const ndcY = -(mouseY / rect.height) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(ndcX, ndcY), cameraRef.current);

    // 1. Check attack node dots intersection
    if (nodesGroupRef.current) {
      const nodeIntersects = raycaster.intersectObjects(nodesGroupRef.current.children, true);
      const hitDot = nodeIntersects.find((hit) => hit.object.userData?.node);
      if (hitDot) {
        setHoveredNode(hitDot.object.userData.node as GeoNode);
        setTooltipPos({ x: mouseX + 15, y: mouseY + 15 });
        container.style.cursor = 'pointer';
        return;
      } else {
        setHoveredNode(null);
      }
    }

    // 2. Check sphere intersection to determine country
    const intersects = raycaster.intersectObjects(globeGroupRef.current.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point.clone();
      // Inverse transform point by globeGroup rotation
      point.applyAxisAngle(new Vector3(1, 0, 0), -tiltAngleRef.current);
      point.applyAxisAngle(new Vector3(0, 1, 0), -rotationAngleRef.current);

      const R = 1.6;
      const normalizedY = Math.max(-1, Math.min(1, point.y / R));
      const lat = 90 - (Math.acos(normalizedY) * 180) / Math.PI;
      let lng = (Math.atan2(point.z, -point.x) * 180) / Math.PI - 180;
      lng = ((((lng + 180) % 360) + 360) % 360) - 180;

      // Find country containing [lng, lat]
      let matchedCountryName: string | null = null;
      for (const feature of countries) {
        try {
          if (d3.geoContains(feature as d3.ExtendedFeature, [lng, lat])) {
            matchedCountryName = feature.properties?.name || null;
            break;
          }
        } catch {
          // ignore containment error
        }
      }

      setHoveredCountry(matchedCountryName);
      if (matchedCountryName) {
        setTooltipPos({ x: mouseX + 15, y: mouseY + 15 });
        container.style.cursor = 'pointer';
      } else {
        container.style.cursor = 'grab';
      }
    } else {
      setHoveredCountry(null);
      setTooltipPos(null);
      container.style.cursor = 'default';
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = () => {
    if (hoveredNode) {
      onSelectNode(hoveredNode);
    } else if (hoveredCountry) {
      onSelectCountry(hoveredCountry);
    }
  };

  const handleResetCamera = () => {
    rotationAngleRef.current = 0;
    tiltAngleRef.current = 0.2;
  };

  const activeCountryData = hoveredCountry ? countryStats[hoveredCountry] : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        backgroundColor: 'var(--bg-0)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* Floating Hover Tooltip */}
      {tooltipPos && (hoveredNode || (hoveredCountry && activeCountryData)) && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            backgroundColor: 'rgba(16, 18, 20, 0.95)',
            border: '1px solid var(--accent)',
            padding: '8px 12px',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
            minWidth: '160px',
          }}
        >
          {hoveredNode ? (
            <div>
              <div className="font-mono label-caps" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                HOST ORIGIN
              </div>
              <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text)' }}>
                {hoveredNode.ip}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Alerts:</span>
                <span className="font-mono">{hoveredNode.count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Severity:</span>
                <span className="font-mono" style={{ textTransform: 'uppercase', color: `var(--sev-${hoveredNode.maxSeverity})` }}>
                  {hoveredNode.maxSeverity}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                {hoveredCountry}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Total Alerts:</span>
                <span className="font-mono tabular-nums">{activeCountryData?.count || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Top Severity:</span>
                <span className="font-mono" style={{ textTransform: 'uppercase', color: `var(--sev-${activeCountryData?.maxSeverity || 'low'})` }}>
                  {activeCountryData?.maxSeverity || 'Nominal'}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '6px', borderTop: '1px solid var(--line)', paddingTop: '4px' }}>
                Click to inspect country events
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera and Rotation HUD Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleResetCamera}
          className="btn"
          style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
          title="Reset Camera View"
        >
          Reset View
        </button>
      </div>
    </div>
  );
};
