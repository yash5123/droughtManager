import { useState, useMemo, useEffect } from 'react';
import { useRankedVillages } from '../hooks/useRiskData.js';
import api from '../services/api.js';
import { getRiskLevel } from '../utils/riskLevels.js';
import { exportToCSV } from '../utils/csv.js';
import { 
  Calculator, 
  Info
} from 'lucide-react';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';

import FormulaExplanation from './risk-calculator/FormulaExplanation.jsx';
import DistrictTable from './risk-calculator/DistrictTable.jsx';
import RiskDetailSidebar from './risk-calculator/RiskDetailSidebar.jsx';

export default function RiskCalculator() {
  const { data: rankedData } = useRankedVillages(1000);
  
  const allVillages = useMemo(() => rankedData?.data || [], [rankedData]);
  
  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); 
  const [riskFilter, setRiskFilter] = useState('All');
  const [limitFilter, setLimitFilter] = useState('All');
  const [detailState, setDetailState] = useState({ villageId: null, data: null });

  const effectiveVillage = selectedVillage ?? allVillages[0] ?? null;
  const effectiveVillageId = effectiveVillage?._id;
  const detailData = detailState.data;
  const detailLoading = effectiveVillageId != null && detailState.villageId !== effectiveVillageId;

  // Resolve audit data: prefer official cached audit if it has the full breakdown data, otherwise fall back to live audit
  const hasCachedAudit = detailData?.cachedAudit?.rdiScore != null;
  const audit = hasCachedAudit ? detailData.cachedAudit : (detailData?.liveAudit || effectiveVillage?.metricsSnapshot || {});
  const auditScore = (hasCachedAudit ? (detailData.cachedScore ?? effectiveVillage?.riskScore) : (detailData?.liveScore ?? effectiveVillage?.riskScore)) ?? 0;

  useEffect(() => {
    if (!effectiveVillageId) return;

    api.get(`/villages/${effectiveVillageId}/detail`)
      .then(res => {
        setDetailState({ villageId: effectiveVillageId, data: res.data });
      })
      .catch(err => {
        console.error('Detail fetch failed:', err);
        setDetailState({ villageId: effectiveVillageId, data: null });
      });

  }, [effectiveVillageId]);



  // Sorting & Filtering
  const filteredVillages = useMemo(() => {
    let list = [...allVillages];

    // 1. Search Filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(v => 
        v.name.toLowerCase().includes(s) || 
        v.district?.toLowerCase().includes(s) || 
        v.state?.toLowerCase().includes(s)
      );
    }

    // 2. Risk Level Filter
    if (riskFilter !== 'All') {
      list = list.filter(v => getRiskLevel(v.riskScore).label === riskFilter);
    }

    // 3. Sorting (Always sort before limiting)
    list.sort((a, b) => {
      const scoreA = a.riskScore || 0;
      const scoreB = b.riskScore || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    // 4. Limit Filter
    if (limitFilter !== 'All') {
      list = list.slice(0, parseInt(limitFilter));
    }

    return list;
  }, [allVillages, searchTerm, sortOrder, riskFilter, limitFilter]);



  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
      <DataSourceBanner dataSource={allVillages.length > 0 ? 'backend' : 'pending'} />

      <style>{`
        .risk-table { width: 100%; border-collapse: collapse; }
        .risk-table th { text-align: left; padding: 16px; color: var(--text-secondary); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--divider); }
        .risk-table td { padding: 16px; border-bottom: 1px solid var(--divider); vertical-align: middle; }
        .risk-row { transition: all 0.2s; cursor: pointer; }
        .risk-row:hover { background: rgba(255,255,255,0.03); transform: scale(1.002); }
        .risk-row.active { background: var(--nav-active-bg); border-left: 4px solid var(--accent-blue); }
        
        .metric-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        
        .formula-card { border-left: 4px solid var(--accent-blue); }
        
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="page-header">
        <div className="header-icon-container">
          <Calculator size={32} />
        </div>
        <div className="header-text">
          <h1 className="header-title">Risk Logic & Transparency</h1>
          <p className="header-subtitle">A comprehensive audit of all {allVillages.length || 732} districts using our 4-pillar non-linear composite scoring engine.</p>
        </div>
      </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-btn" style={{ padding: '10px 20px', gap: '8px' }} onClick={() => setShowFormulaInfo(!showFormulaInfo)}>
            <Info size={18} /> {showFormulaInfo ? 'Close Math' : 'Explain Formula'}
          </button>
        </div>
      </div>

      <FormulaExplanation showFormulaInfo={showFormulaInfo} />

      <div className="split-panel" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        <DistrictTable
          filteredVillages={filteredVillages}
          selectedVillage={effectiveVillage}
          setSelectedVillage={setSelectedVillage}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          limitFilter={limitFilter}
          setLimitFilter={setLimitFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          toggleSort={toggleSort}
          sortOrder={sortOrder}
          getRiskLevel={getRiskLevel}
          exportToCSV={exportToCSV}
        />

        <RiskDetailSidebar
          selectedVillage={effectiveVillage}
          auditScore={auditScore}
          audit={audit}
          getRiskLevel={getRiskLevel}
          detailData={detailData}
          detailLoading={detailLoading}
        />

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>

      </div>
    </div>
  );
}



