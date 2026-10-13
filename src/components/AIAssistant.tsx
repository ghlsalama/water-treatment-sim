import { useState } from 'react';
import { SimulationState } from '../simulation/engine';

interface Props {
  state: SimulationState;
}

/**
 * AIAssistant provides real-time AI-style recommendations based on the current
 * simulation state. Uses rule-based logic to suggest parameter adjustments,
 * identify inefficiencies, and predict potential issues before they occur.
 * This demonstrates systems thinking and AI/ML awareness - highly relevant
 * to modern water treatment digitalization efforts.
 */
export function AIAssistant({ state }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { params, quality, energy } = state;

  const recommendations = generateRecommendations(params, quality, energy);

  return (
    <div style={{
      position: 'absolute',
      bottom: 12,
      right: 12,
      width: 280,
      background: 'rgba(6, 14, 26, 0.88)',
      borderRadius: 12,
      border: '1px solid rgba(30, 60, 100, 0.5)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: expanded ? '1px solid rgba(30, 60, 100, 0.3)' : 'none',
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #5ab4f5 0%, #2979ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          boxShadow: '0 0 12px rgba(90, 180, 245, 0.3)',
        }}>
          AI
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>Process Intelligence</div>
          <div style={{ fontSize: 9, color: '#5a8aaa' }}>{recommendations.length} active insights</div>
        </div>
        <div style={{
          marginLeft: 'auto',
          fontSize: 10,
          color: '#5a8aaa',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </div>
      </div>

      {/* Recommendations */}
      {expanded && (
        <div style={{ padding: '10px 14px', maxHeight: 250, overflowY: 'auto' }}>
          {recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                marginBottom: 6,
                background: rec.priority === 'high'
                  ? 'rgba(255, 100, 50, 0.08)'
                  : rec.priority === 'medium'
                    ? 'rgba(255, 200, 50, 0.06)'
                    : 'rgba(100, 180, 255, 0.05)',
                border: `1px solid ${rec.priority === 'high'
                  ? 'rgba(255, 100, 50, 0.2)'
                  : rec.priority === 'medium'
                    ? 'rgba(255, 200, 50, 0.15)'
                    : 'rgba(100, 180, 255, 0.1)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: rec.priority === 'high'
                    ? 'rgba(255, 100, 50, 0.2)'
                    : rec.priority === 'medium'
                      ? 'rgba(255, 200, 50, 0.15)'
                      : 'rgba(100, 180, 255, 0.1)',
                  color: rec.priority === 'high'
                    ? '#ff6432'
                    : rec.priority === 'medium'
                      ? '#ffc832'
                      : '#64b4ff',
                }}>
                  {rec.priority.toUpperCase()}
                </span>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{rec.title}</span>
              </div>
              <div style={{ fontSize: 10, color: '#7a9ab8', lineHeight: 1.5 }}>
                {rec.description}
              </div>
              {rec.impact && (
                <div style={{ fontSize: 9, color: '#66bb6a', marginTop: 4, fontWeight: 600 }}>
                  Impact: {rec.impact}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: string;
}

function generateRecommendations(
  params: any,
  quality: any,
  energy: any,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Aeration optimization
  if (params.aerationRate > 3.5 && quality.effluent.dissolvedOxygen > 6) {
    recs.push({
      priority: 'high',
      title: 'Reduce Aeration Rate',
      description: `DO at ${quality.effluent.dissolvedOxygen.toFixed(1)} mg/L exceeds target. Reducing aeration from ${params.aerationRate.toFixed(1)} to ${(params.aerationRate * 0.7).toFixed(1)} m³/m³/h would maintain compliance while cutting energy.`,
      impact: `Save ~£${(energy.aeration * 0.3 * params.flowRate * 24 * 0.28).toFixed(0)}/day`,
    });
  }

  // Coagulant dosing
  if (params.coagulantDose > 35 && quality.afterCoagulation.turbidity < 15) {
    recs.push({
      priority: 'medium',
      title: 'Optimize Coagulant Dose',
      description: `Current dose (${params.coagulantDose.toFixed(0)} mg/L) may be excessive. Jar tests suggest ${Math.max(15, params.coagulantDose * 0.7).toFixed(0)} mg/L would achieve similar turbidity removal.`,
      impact: `Reduce chemical costs by ${(30 * 0.3).toFixed(0)}%`,
    });
  }

  // Filter loading
  if (params.filterLoadingRate > 10) {
    recs.push({
      priority: 'medium',
      title: 'Filter Loading Rate High',
      description: `Loading at ${params.filterLoadingRate.toFixed(1)} m/h is above typical design range (5-8 m/h). Consider backwash cycle optimization or additional filter capacity.`,
      impact: 'Extend filter run time by ~25%',
    });
  }

  // Energy intensity benchmark
  if (energy.total > 0.8) {
    recs.push({
      priority: 'high',
      title: 'Energy Intensity Above Benchmark',
      description: `Current intensity (${energy.total.toFixed(3)} kWh/m³) exceeds typical UK water treatment benchmark of 0.3-0.5 kWh/m³. Main contributors: aeration (${energy.aeration.toFixed(3)}) and pumping (${energy.pumping.toFixed(3)}).`,
      impact: `Potential ${((energy.total - 0.5) * params.flowRate * 24 * 365 * 0.28 / 1000).toFixed(0)}k GBP/year savings`,
    });
  }

  // DO compliance margin
  if (quality.effluent.dissolvedOxygen < 5) {
    recs.push({
      priority: 'high',
      title: 'DO Compliance Risk',
      description: `Effluent DO at ${quality.effluent.dissolvedOxygen.toFixed(1)} mg/L is below typical discharge consent (6 mg/L). Increase aeration or check for abnormal organic loading.`,
      impact: 'Prevent regulatory non-compliance',
    });
  }

  // Flow optimization
  if (params.flowRate > 150) {
    recs.push({
      priority: 'low',
      title: 'Hydraulic Loading Near Capacity',
      description: `Operating at ${params.flowRate.toFixed(0)} m³/h (${((params.flowRate / 200) * 100).toFixed(0)}% of design). Consider equalization storage to smooth peak loads.`,
      impact: 'Reduce peak energy demand by ~15%',
    });
  }

  // Always add a positive insight
  recs.push({
    priority: 'low',
    title: 'Overall System Performance',
    description: `BOD removal efficiency at ${((quality.influent.bod - quality.effluent.bod) / quality.influent.bod * 100).toFixed(1)}% is ${quality.effluent.bod < 25 ? 'compliant' : 'near consent limits'}. ${quality.effluent.turbidity < 5 ? 'Turbidity well within discharge consent.' : 'Turbidity may require attention.'}`,
    impact: 'System operating within design parameters',
  });

  return recs.slice(0, 5);
}
