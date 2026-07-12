/**
 * E2E: Authentication Flow
 * Tests login redirect, mock Google OAuth success/failure
 */

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear localStorage to reset any cached user state
    cy.clearLocalStorage();
  });

  it('redirects unauthenticated users to login page', () => {
    // Mock get me to return 401
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { error: 'Unauthorized' }
    }).as('getMeUnauth');

    cy.visit('/tankers');
    
    // The app should redirect to /login
    cy.url().should('include', '/login');

    // The avatar should display '?' when logged out
    cy.get('.user-avatar').should('contain', '?');
  });

  it('handles successful login (mocked API)', () => {
    // Mock get me to return user
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          _id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    }).as('getMeAuth');

    // Mock the Google OAuth callback response
    cy.intercept('POST', '**/api/auth/google', {
      statusCode: 200,
      body: {
        user: {
          _id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    }).as('googleAuth');

    // Pre-seed localStorage user cache to avoid initial check redirect
    cy.window().then((win) => {
      win.localStorage.setItem('aqvasense_user_cache', JSON.stringify({
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
      }));
    });

    cy.visit('/tankers');

    // The app should not redirect to /login
    cy.url().should('include', '/tankers');

    // The avatar should display 'T' (initial of Test User) when logged in
    cy.get('.user-avatar').should('contain', 'T');
  });

  it('handles failed login gracefully', () => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { error: 'Unauthorized' }
    }).as('getMeFail');

    cy.intercept('POST', '**/api/auth/google', {
      statusCode: 401,
      body: { error: 'Authentication failed' },
    }).as('googleAuthFail');

    cy.visit('/');
    cy.get('.user-avatar').should('contain', '?');
  });
});
