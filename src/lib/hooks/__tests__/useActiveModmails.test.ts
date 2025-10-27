import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Create mock instances that will be used by the module
const mockCacheInstance = {
  cacheable: jest.fn() as jest.MockedFunction<any>,
  isCached: jest.fn() as jest.MockedFunction<any>,
  clear: jest.fn() as jest.MockedFunction<any>,
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockModmail = {
  find: jest.fn() as jest.MockedFunction<any>,
};

// Mock Cacheables
jest.mock('cacheables', () => ({
  Cacheables: jest.fn().mockImplementation(() => mockCacheInstance),
}));

// Mock Arc3
jest.mock('../../arc/arc3.js', () => ({
  Arc3: {
    Arc3: {
      clientLogger: {
        child: jest.fn(() => mockLogger),
      },
    },
  },
}));

// Mock Modmail schema
jest.mock('../../schema/v1/Modmail.js', () => ({
  default: mockModmail,
}));

import { useActiveModmails } from '../useActiveModmails';

describe('useActiveModmails', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize correctly and return actions and states', () => {
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useActiveModmails();

    expect(result).toHaveProperty('actions');
    expect(result).toHaveProperty('states');
    expect(result.actions).toHaveProperty('buildCache');
    expect(result.states).toHaveProperty('activeModmailsCache');
    expect(result.states).toHaveProperty('logger');
  });

  it('should return buildCache function that calls cacheable', async () => {
    const mockModmails = [
      { _id: '1', userId: 'user1', channelId: 'channel1' },
      { _id: '2', userId: 'user2', channelId: 'channel2' },
    ];

    (mockModmail.find as jest.MockedFunction<any>).mockResolvedValue(mockModmails);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockResolvedValue(mockModmails);
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useActiveModmails();
    await result.actions.buildCache();

    expect(mockCacheInstance.cacheable).toHaveBeenCalled();
  });

  it('should fetch modmails from database when building cache', async () => {
    const mockModmails = [
      { _id: '1', userId: 'user1', channelId: 'channel1' },
      { _id: '2', userId: 'user2', channelId: 'channel2' },
    ];

    (mockModmail.find as jest.MockedFunction<any>).mockResolvedValue(mockModmails);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockImplementation(async (fn: () => Promise<any>) => await fn());
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useActiveModmails();
    const cacheResult = await result.actions.buildCache();

    expect(mockModmail.find).toHaveBeenCalledWith();
    expect(cacheResult).toEqual(mockModmails);
  });

  it('should handle database errors gracefully', async () => {
    const mockError = new Error('Database connection failed');
    (mockModmail.find as jest.MockedFunction<any>).mockRejectedValue(mockError);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockImplementation(async (fn: () => Promise<any>) => await fn());
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useActiveModmails();

    await expect(result.actions.buildCache()).rejects.toThrow('Database connection failed');
    expect(mockModmail.find).toHaveBeenCalledWith();
  });

  it('should return empty array when no modmails exist', async () => {
    (mockModmail.find as jest.MockedFunction<any>).mockResolvedValue([]);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockImplementation(async (fn: () => Promise<any>) => await fn());
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useActiveModmails();
    const cacheResult = await result.actions.buildCache();

    expect(cacheResult).toEqual([]);
    expect(mockModmail.find).toHaveBeenCalledWith();
  });
});