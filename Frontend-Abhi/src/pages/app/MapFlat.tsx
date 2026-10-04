import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import worldData from '../../data/world-110m.json';
import type { Alert, Severity } from '../../types/api';

export interface GeoNode {
  ip: string;
  count: number;
  maxSeverity: Severity;
  coordinates: [number, number]; // [lng, lat]
  alerts: Alert[];
  isSimulated: boolean;
  countryName?: string;
}

interface MapFlatProps {
  geoNodes: GeoNode[];
  selectedNode: GeoNode | null;
  onSelectNode: (node: GeoNode) => void;
  hoveredCountry?: string | null;
  onHoverCountry?: (countryName: string | null) => void;
  onSelectCountry?: (countryName: string) => void;
}

export const MapFlat: React.FC<MapFlatProps> = ({
  geoNodes,
  onSelectNode,
  hoveredCountry,
  onHoverCountry,
  onSelectCountry,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 960;
    const height = 480;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Natural Earth projection
    const projection = d3.geoNaturalEarth1()
      .scale(155)
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Graticule (0.5px line at 40% opacity)
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'var(--line)')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.4);

    // Render world countries from bundled TopoJSON
    const countries = topojson.feature(
      worldData as unknown as Parameters<typeof topojson.feature>[0],
      worldData.objects.countries as unknown as Parameters<typeof topojson.feature>[1]
    ) as unknown as { features: Array<{ id: string; properties?: { name: string } }> };

    // Country land paths
    const countryGroup = svg.append('g').attr('class', 'countries');
    countryGroup
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', pathGenerator as unknown as string)
      .attr('fill', (d) => (d.properties?.name === hoveredCountry ? 'rgba(182, 255, 59, 0.12)' : 'var(--bg-1)'))
      .attr('stroke', (d) => (d.properties?.name === hoveredCountry ? 'var(--accent)' : 'var(--line-strong)'))
      .attr('stroke-width', (d) => (d.properties?.name === hoveredCountry ? 1.5 : 0.75))
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.15s ease, stroke 0.15s ease')
      .on('mouseenter', (_, d) => {
        if (d.properties?.name && onHoverCountry) {
          onHoverCountry(d.properties.name);
        }
      })
      .on('mouseleave', () => {
        if (onHoverCountry) onHoverCountry(null);
      })
      .on('click', (_, d) => {
        if (d.properties?.name && onSelectCountry) {
          onSelectCountry(d.properties.name);
        }
      });

    // Draw attack source nodes
    const nodeGroup = svg.append('g').attr('class', 'threat-nodes');

    geoNodes.forEach((node) => {
      const projected = projection(node.coordinates);
      if (!projected) return;
      const [cx, cy] = projected;

      const severityColors: Record<Severity, string> = {
        critical: 'var(--sev-critical)',
        high: 'var(--sev-high)',
        medium: 'var(--sev-medium)',
        low: 'var(--sev-low)',
        info: 'var(--text-dim)',
      };
      const color = severityColors[node.maxSeverity] || 'var(--accent)';
      const radius = Math.min(12, Math.max(4, 3 + node.count * 1.5));

      const g = nodeGroup.append('g')
        .style('cursor', 'pointer')
        .on('click', (e) => {
          e.stopPropagation();
          onSelectNode(node);
        });

      // Pulse ring on arrival (expands 0 to 24px)
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', `${radius};${radius + 18}`)
        .attr('dur', '1.8s')
        .attr('repeatCount', 'indefinite');

      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '1;0')
        .attr('dur', '1.8s')
        .attr('repeatCount', 'indefinite');

      // Static center core dot
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', radius)
        .attr('fill', color)
        .attr('stroke', 'var(--bg-0)')
        .attr('stroke-width', 1);
    });
  }, [geoNodes, hoveredCountry, onHoverCountry, onSelectCountry, onSelectNode]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 960 480"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
};
