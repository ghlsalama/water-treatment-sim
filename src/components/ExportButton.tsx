import { useState } from 'react';
import { SimulationState } from '../simulation/engine';

interface Props {
  state: SimulationState;
}

/**
 * ExportButton generates a professional PDF-style report of the current simulation
 * state, suitable for sharing with engineers or including in a portfolio.
 * Creates a downloadable HTML report with all key metrics and parameters.
 */
export function ExportButton({ state }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);

    const { quality, energy, params, treatmentResults } = state;

    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Arcadis Water Treatment - Energy Optimization Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a2d45; }
    h1 { color: #1565c0; border-bottom: 3px solid #1565c0; padding-bottom: 10px; }
    h2 { color: #2a4a6a; margin-top: 30px; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 20px 0; }
    .metric-card { background: #f0f4f8; border-radius: 8px; padding: 16px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: 800; color: #1565c0; }
    .metric-label { font-size: 11px; color: #5a7a9a; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #d0dce8; font-size: 13px; }
    th { background: #f0f4f8; font-weight: 600; color: #2a4a6a; }
    .savings { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .savings-title { color: #2e7d32; font-weight: 700; font-size: 14px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d0dce8; font-size: 11px; color: #8ba3c0; text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 700; }
    .badge-green { background: #e8f5e9; color: #2e7d32; }
    .badge-orange { background: #fff3e0; color: #e65100; }
  </style>
</head>
<body>
  <h1>Arcadis Water Treatment — Energy Optimization Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Simulation Duration:</strong> ${state.time.toFixed(1)}s</p>
  <p><strong>Status:</strong> ${state.running ? 'Running' : 'Paused'}</p>

  <h2>Executive Summary</h2>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-value">${energy.total.toFixed(3)}</div>
      <div class="metric-label">Energy Intensity (kWh/m³)</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${(treatmentResults.overallRemovalEfficiency * 100).toFixed(1)}%</div>
      <div class="metric-label">BOD Removal Efficiency</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">£${energy.costPerDay.toFixed(0)}</div>
      <div class="metric-label">Daily Operating Cost</div>
    </div>
  </div>

  <h2>Water Quality</h2>
  <table>
    <tr><th>Parameter</th><th>Influent</th><th>Effluent</th><th>Target</th><th>Status</th></tr>
    <tr>
      <td>Turbidity</td>
      <td>${quality.influent.turbidity.toFixed(1)} NTU</td>
      <td>${quality.effluent.turbidity.toFixed(1)} NTU</td>
      <td>< 5 NTU</td>
      <td><span class="badge ${quality.effluent.turbidity < 5 ? 'badge-green' : 'badge-orange'}">${quality.effluent.turbidity < 5 ? 'PASS' : 'FAIL'}</span></td>
    </tr>
    <tr>
      <td>BOD</td>
      <td>${quality.influent.bod.toFixed(1)} mg/L</td>
      <td>${quality.effluent.bod.toFixed(1)} mg/L</td>
      <td>< 25 mg/L</td>
      <td><span class="badge ${quality.effluent.bod < 25 ? 'badge-green' : 'badge-orange'}">${quality.effluent.bod < 25 ? 'PASS' : 'FAIL'}</span></td>
    </tr>
    <tr>
      <td>Dissolved Oxygen</td>
      <td>${quality.influent.dissolvedOxygen.toFixed(1)} mg/L</td>
      <td>${quality.effluent.dissolvedOxygen.toFixed(1)} mg/L</td>
      <td>> 4 mg/L</td>
      <td><span class="badge ${quality.effluent.dissolvedOxygen > 4 ? 'badge-green' : 'badge-orange'}">${quality.effluent.dissolvedOxygen > 4 ? 'PASS' : 'FAIL'}</span></td>
    </tr>
    <tr>
      <td>Suspended Solids</td>
      <td>${quality.influent.suspendedSolids.toFixed(1)} mg/L</td>
      <td>${quality.effluent.suspendedSolids.toFixed(1)} mg/L</td>
      <td>< 30 mg/L</td>
      <td><span class="badge ${quality.effluent.suspendedSolids < 30 ? 'badge-green' : 'badge-orange'}">${quality.effluent.suspendedSolids < 30 ? 'PASS' : 'FAIL'}</span></td>
    </tr>
  </table>

  <h2>Energy Breakdown (kWh/m³)</h2>
  <table>
    <tr><th>Stage</th><th>Energy</th><th>% of Total</th></tr>
    <tr><td>Aeration</td><td>${energy.aeration.toFixed(3)}</td><td>${(energy.aeration / energy.total * 100).toFixed(1)}%</td></tr>
    <tr><td>Pumping</td><td>${energy.pumping.toFixed(3)}</td><td>${(energy.pumping / energy.total * 100).toFixed(1)}%</td></tr>
    <tr><td>Filtration</td><td>${energy.filtration.toFixed(3)}</td><td>${(energy.filtration / energy.total * 100).toFixed(1)}%</td></tr>
    <tr><td>Coagulation</td><td>${energy.coagulation.toFixed(3)}</td><td>${(energy.coagulation / energy.total * 100).toFixed(1)}%</td></tr>
    <tr><td>Flocculation</td><td>${energy.flocculation.toFixed(3)}</td><td>${(energy.flocculation / energy.total * 100).toFixed(1)}%</td></tr>
    <tr><td>Chemical</td><td>${energy.chemical.toFixed(3)}</td><td>${(energy.chemical / energy.total * 100).toFixed(1)}%</td></tr>
    <tr><td>Sedimentation</td><td>${energy.sedimentation.toFixed(3)}</td><td>${(energy.sedimentation / energy.total * 100).toFixed(1)}%</td></tr>
    <tr style="font-weight:700"><td>Total</td><td>${energy.total.toFixed(3)}</td><td>100%</td></tr>
  </table>

  <h2>Process Parameters</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    <tr><td>Flow Rate</td><td>${params.flowRate.toFixed(0)} m³/h</td></tr>
    <tr><td>Coagulant Dose</td><td>${params.coagulantDose.toFixed(0)} mg/L</td></tr>
    <tr><td>Mix Intensity</td><td>${(params.mixingIntensity * 100).toFixed(0)}%</td></tr>
    <tr><td>Flocculation Time</td><td>${(params.flocculationTime / 60).toFixed(0)} min</td></tr>
    <tr><td>Filter Loading Rate</td><td>${params.filterLoadingRate.toFixed(1)} m/h</td></tr>
    <tr><td>Aeration Rate</td><td>${params.aerationRate.toFixed(1)} m³/m³/h</td></tr>
    <tr><td>Target DO</td><td>${params.dissolvedOxygen.toFixed(1)} mg/L</td></tr>
  </table>

  <div class="savings">
    <div class="savings-title">Sustainability Impact</div>
    <p>Daily CO₂ emissions: <strong>${energy.carbonPerDay.toFixed(0)} kg CO₂/day</strong></p>
    <p>Annual carbon footprint: <strong>${(energy.carbonPerDay * 365 / 1000).toFixed(1)} tonnes CO₂/year</strong></p>
    <p>Energy cost: <strong>£${energy.costPerDay.toFixed(0)}/day (£${(energy.costPerDay * 365).toFixed(0)}/year)</strong></p>
  </div>

  <div class="footer">
    Generated by Arcadis Water Treatment Energy Optimization Demo<br>
    Sustainable Design · Engineering · Consultancy · Improving Quality of Life
  </div>
</body>
</html>`;

    // Create download
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcadis-water-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        padding: '6px 14px',
        background: exporting
          ? 'rgba(30, 60, 100, 0.3)'
          : 'linear-gradient(180deg, rgba(26, 58, 95, 0.9) 0%, rgba(20, 45, 75, 0.9) 100%)',
        color: exporting ? '#5a8aaa' : '#5ab4f5',
        border: '1px solid rgba(30, 60, 100, 0.5)',
        borderRadius: 6,
        cursor: exporting ? 'wait' : 'pointer',
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {exporting ? 'Generating...' : 'Export Report'}
    </button>
  );
}
