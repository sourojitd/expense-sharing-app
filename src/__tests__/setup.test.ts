/**
 * Basic setup test to verify the testing environment is working
 */

describe('Project Setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });

  it('should be able to import environment variables', () => {
    // This test verifies that the environment is set up correctly
    expect(process.env.NODE_ENV).toBeDefined();
  });
});