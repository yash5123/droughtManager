import { Calculator, RefreshCw, CheckCircle, AlertTriangle, Search } from 'lucide-react';

export default function RiskDetailSidebar({
  selectedVillage,
  auditScore,
  audit,
  getRiskLevel,
  detailData,
  detailLoading
}) {
  return (
    <div className="detail-sidebar" style={{ width: '400px', position: 'sticky', top: '0', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideInRight 0.4s ease-out' }}>
      {selectedVillage ? (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 className="section-header" style={{ fontSize: '20px' }}>{selectedVillage.name}</h3>
            <p className="caption-text" style={{ color: 'var(--text-tertiary)' }}>{selectedVillage.state.toUpperCase()} • {selectedVillage.district.toUpperCase()}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', position: 'relative' }}>
            <div style={{ textAlign: 'center', zIndex: 2 }}>
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, color: getRiskLevel(auditScore).color }}>
                {auditScore.toFixed(1)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-tertiary)', marginTop: '8px' }}>DR INDEX</div>
            </div>
            {/* Decorative background glow */}
            <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: getRiskLevel(auditScore).color, filter: 'blur(60px)', opacity: 0.15 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* CALCULATION BREAKDOWN PANEL */}
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--glass-bg)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow-elevated)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--accent-cyan), transparent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--divider)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calculator size={16} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                      {detailData ? 'OFFICIAL NIGHTLY AUDIT' : 'CACHED RISK BREAKDOWN'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {audit.calculatedAt ? new Date(audit.calculatedAt).toLocaleTimeString() : ''}
                  </span>
                </div>

                {detailLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '12px' }}>
                    <RefreshCw size={16} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Calculating live score...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Step 1: Pillar Scores */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* RDI Pillar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>RDI (Rainfall)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                              RAW: {(audit.rdiScore ?? 0).toFixed(1)} × 35%
                            </span>
                            {audit.actualPrecipitation != null && (
                              <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 700 }}>
                                • {audit.actualPrecipitation.toFixed(1)}mm vs {audit.historicalMonthlyAvg?.toFixed(1)}mm avg
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)' }}>+{(audit.rdiWeighted ?? (audit.rdiScore ?? 0) * 0.35).toFixed(2)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                        </div>
                      </div>

                      {/* CDD Pillar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>CDD (Dryness)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                              RAW: {(audit.cddScore ?? 0).toFixed(1)} × 20%
                            </span>
                            {audit.maxDryStreak != null && (
                              <span style={{ fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                                • {audit.maxDryStreak} day streak
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-amber)' }}>+{(audit.cddWeighted ?? (audit.cddScore ?? 0) * 0.20).toFixed(2)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                        </div>
                      </div>

                      {/* SMA Pillar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>SMA (Soil)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {audit.smaWasMissing ? (
                              <span style={{ fontSize: '10px', color: 'var(--accent-amber)', fontStyle: 'italic' }}>Missing satellite data</span>
                            ) : (
                              <>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                                  RAW: {(audit.smaScore ?? 0).toFixed(1)} × 30%
                                </span>
                                {audit.soilMoistureFrac != null && (
                                  <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                                    • {(audit.soilMoistureFrac * 100).toFixed(1)}% moisture
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: audit.smaWasMissing ? 'var(--text-tertiary)' : 'var(--accent-cyan)' }}>
                            {audit.smaWasMissing ? '---' : `+${(audit.smaWeighted ?? (audit.smaScore ?? 0) * 0.30).toFixed(2)}`}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                        </div>
                      </div>

                      {/* PPA Pillar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>PPA (Demand)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                              RAW: {(audit.ppaScore ?? 0).toFixed(1)} × 10%
                            </span>
                            {audit.demandLitersPerDay != null && (
                              <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 700 }}>
                                • {(audit.demandLitersPerDay / 1000).toFixed(0)}k L/day gap
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#8b5cf6' }}>+{(audit.ppaWeighted ?? (audit.ppaScore ?? 0) * 0.10).toFixed(2)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--divider)', margin: '4px 0' }} />

                    {/* Step 2: Composite Assembly */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Raw Weighted Sum</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>= {(audit.rawComposite ?? 0).toFixed(3)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-primary)' }}>Adjusted Composite</span>
                        <span style={{ color: 'var(--text-primary)' }}>= {(audit.adjustedComposite ?? 0).toFixed(3)}</span>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--divider)', margin: '4px 0' }} />

                    {/* Step 3: Compression */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Non-linear compression: {audit.compressionBand || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{(audit.adjustedComposite ?? 0).toFixed(1)} → compressed →</span>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: getRiskLevel(auditScore).color }}>
                          {auditScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--divider)', margin: '4px 0' }} />

                    {/* Step 4: Final Risk Index */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>FINAL RISK INDEX</span>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: getRiskLevel(auditScore).color }}>
                        {auditScore.toFixed(1)}
                      </span>
                    </div>

                    {/* Validation Row */}
                    {detailData?.cachedScore != null && detailData?.liveScore != null && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        borderRadius: '8px', 
                        background: Math.abs(detailData.liveScore - detailData.cachedScore) < 0.1 ? 'var(--risk-normal-tint)' : 'var(--risk-severe-tint)',
                        border: `1px solid var(--divider)`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px'
                      }}>
                        {Math.abs(detailData.liveScore - detailData.cachedScore) < 0.1 ? (
                          <>
                            <CheckCircle size={14} color="var(--accent-green)" />
                            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Math matches official cache</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={14} color="var(--accent-amber)" />
                            <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                              Live ({detailData.liveScore?.toFixed(1)}) differs from cached ({detailData.cachedScore?.toFixed(1)}). Cache updates nightly.
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Search size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Select a district to see the detailed math breakdown.</p>
        </div>
      )}
    </div>
  );
}
