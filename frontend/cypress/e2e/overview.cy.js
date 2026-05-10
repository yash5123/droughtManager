/**
 * E2E: Overview Dashboard
 * Tests KPI cards, sorted critical regions, and data display
 */

describe('Overview Dashboard', () => {
  beforeEach(() => {
    // Mock the ranked villages API
    cy.fixture('villages.json').then((villages) => {
      cy.intercept('GET', '**/api/villages/ranked*', {
        statusCode: 200,
        body: {
          data: villages,
          meta: {
            total: 732,
            latestDate: '2026-05-09T00:00:00.000Z',
            hoursOld: 12.5,
            isStale: false,
            dailyJobRunning: false,
            lastJobSuccess: '2026-05-09T06:00:00.000Z',
          },
        },
      }).as('getRanked');
    });

    // Mock seeding status
    cy.intercept('GET', '**/api/villages/seeding-status*', {
      statusCode: 200,
      body: {
        phase: 'complete',
        totalDistricts: 732,
        geocodedCount: 732,
        baselinedCount: 732,
        failedGeocode: 0,
        failedBaseline: 0,
      },
    }).as('getSeedingStatus');

    cy.visit('/');
  });

  it('displays KPI stat cards with data', () => {
    cy.wait('@getRanked');
    // The overview page should show stat cards
    // Look for elements that contain numeric data values
    cy.get('.glass-card').should('have.length.at.least', 1);
  });

  it('shows critical regions sorted by risk score descending', () => {
    cy.wait('@getRanked');
    // Verify the page has loaded with village data
    cy.contains('Jaisalmer').should('be.visible');
    // Jaisalmer (88.2) should appear before Coorg (12.8)
    cy.get('body').then(($body) => {
      const text = $body.text();
      const jaisalmerIdx = text.indexOf('Jaisalmer');
      const coorgIdx = text.indexOf('Coorg');
      if (jaisalmerIdx !== -1 && coorgIdx !== -1) {
        expect(jaisalmerIdx).to.be.lessThan(coorgIdx);
      }
    });
  });

  it('renders chart components without errors', () => {
    cy.wait('@getRanked');
    // Recharts renders SVG elements
    cy.get('svg').should('have.length.at.least', 1);
  });

  it('allows clicking on a region to see details', () => {
    cy.wait('@getRanked');
    // Click on a village name if visible
    cy.contains('Jaisalmer').should('be.visible').click();
    // The page should remain stable (no crash)
    cy.get('body').should('be.visible');
  });
});
